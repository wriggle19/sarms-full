# SARMS — School Asset & Resource Management System
## Application Architecture (NestJS + PostgreSQL)

This is the full design for the system, matching the screens you've already had
Stitch generate. It covers the database, the backend module structure, the
request/approval engine, RBAC, auth, and how to deploy it starting on your local
VM with a clean path to the internet later.

A companion file, `prisma/schema.prisma`, is the actual database schema — 37
tables, 20 enums, structurally checked (balanced/consistent) in this environment.
Full `prisma validate` needs to hit Prisma's own binary servers, which this
sandbox can't reach — run it as your first command once you're on your own
machine, before writing any application code:

```
npx prisma validate
```

---

## 1. Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | NestJS (TypeScript) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | Passport.js strategies (local + JWT), ready for Google/Entra ID/LDAP later |
| File storage | Local disk volume (Phase 1), swappable for S3-compatible storage later |
| Queue/notifications | BullMQ + Redis (email/notification jobs, overdue checks) |
| Frontend | Whatever you build the Stitch screens into — React is the natural fit given your existing projects |
| Containerization | Docker Compose (app, Postgres, Redis, Nginx reverse proxy) |

---

## 2. Folder structure

```
sarms/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── auth/                # login, JWT, guards, future SSO strategies
│   ├── users/
│   ├── roles-permissions/   # RBAC: roles, permissions, assignment
│   ├── departments/
│   ├── locations/           # campuses, buildings, floors, rooms
│   ├── academic-years/
│   ├── asset-catalog/       # categories, statuses, conditions (admin-configurable)
│   ├── assets/              # asset master record + QR/barcode
│   ├── custody/             # assignments + transfers (the history-preserving ledger)
│   ├── requests/            # asset requests
│   ├── approvals/           # workflow engine, steps, decisions
│   ├── issuance/            # turning an approved request into an assignment
│   ├── vendors/
│   ├── procurement/         # purchase orders + items
│   ├── maintenance/
│   ├── incidents/           # lost/missing/stolen/damaged
│   ├── disposal/
│   ├── stocktake/
│   ├── history/             # AssetHistory read model, timeline endpoints
│   ├── audit/                # AuditLog, written by an interceptor, not by hand
│   ├── notifications/       # templates, dispatch, BullMQ processors
│   ├── attachments/          # file upload/download, permission-checked
│   ├── reports/              # aggregation/reporting endpoints
│   ├── common/                # guards, decorators, pipes, interceptors
│   └── main.ts
├── docker-compose.yml
├── Dockerfile
└── .env
```

Each domain folder is a NestJS module: its own controller, service, and
Prisma-backed repository. Nothing reaches into another module's database
queries directly — cross-module needs go through that module's service. This
matters here specifically because so many actions (issuing an asset, for
example) touch five or six domains (assets, custody, requests, notifications,
history, audit) at once, and you want that orchestration in one place
(`issuance/issuance.service.ts`), not scattered.

---

## 3. The core design decision: custody is a ledger, never a field

This is the single most important modeling decision in the whole system, and
it's why `Asset.currentCustodianId` doesn't exist as a real column you write to
directly.

- **`Asset`** holds only *current-state pointers* for fast reads: current room,
  current status, current condition.
- **`AssetAssignment`** is the ledger of "who has/had this and why" — created
  on issuance, closed on return. Never edited after the fact except to close it.
- **`AssetTransfer`** is the ledger of "this moved from X to Y" — for
  room/department/custodian changes that aren't a fresh issuance.
- **`AssetHistory`** is a flattened, append-only feed built from both of the
  above (plus maintenance, incidents, disposal) purely so the asset detail
  screen's timeline tab is a single fast query instead of a UNION across five
  tables at render time.

Every service that changes custody, location, or status writes to the ledger
table *and* appends an `AssetHistory` row *and* lets the audit interceptor log
the change — in that order, in one database transaction. If you only remember
one rule from this document: **nothing overwrites `AssetAssignment` or
`AssetTransfer` rows. New state is always a new row.**

---

## 4. RBAC model

- `Permission` — atomic capabilities (`assets.create`, `requests.approve`,
  `finance.view`, `disposal.approve`, ...). Seed these from the permission list
  in your original spec (Section 5).
- `Role` — a named bundle of permissions (IT Director, Department Head, Finance
  Officer, Teacher, ...). Admins can create new roles and edit their
  permissions without a deploy.
- `UserRole` — many-to-many, so a user can hold more than one role (e.g. a
  Department Head who is also a Line Manager).
- A `PermissionGuard` (NestJS guard) checks `request.user.permissions` — computed
  once at login and cached in the JWT payload — against a `@RequirePermission()`
  decorator on each controller method. No permission logic lives inside
  controllers or services.
- Record-level rules that can't be expressed as a flat permission (e.g. "a
  manager can only approve requests from their own direct reports", "a user
  cannot approve their own request") are enforced in the relevant service, not
  the guard — the guard answers "can this role do this kind of thing at all",
  the service answers "can this specific user do it to this specific record".

---

## 5. Request → approval → issuance lifecycle

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → ISSUED → COMPLETED
                          ↓                ↓
                     REJECTED      CHANGES_REQUESTED → back to SUBMITTED
```

- `ApprovalWorkflow` + `ApprovalStep` are the configurable rule set (Section 49
  of your spec) — an admin picks which request types/categories/value
  thresholds route through which chain of approver roles, entirely through
  data, not code.
- When a request is submitted, `requests.service` resolves the applicable
  `ApprovalWorkflow` (falling back to a default), snapshots its steps onto the
  request, and sets `currentApprovalStepId` to step 1.
- Each `RequestApproval` decision advances or ends the chain. A rejection or
  "changes requested" at any step stops the flow immediately.
- Once every step is `APPROVED`, the request becomes `APPROVED` and appears in
  the IT/Asset Officer's issuance queue.
- `issuance.service` is the only place allowed to create an `AssetAssignment` from
  a request. It checks the asset isn't already assigned/under
  maintenance/retired (Section 65 business rules), creates the assignment,
  flips the asset's status, writes history, and triggers the acknowledgement
  step.
- A user can never approve their own request — enforced in `approvals.service`
  by comparing `approverId` to the request's `requesterId` chain (including
  checking they aren't approving as their own supervisor in a misconfigured
  workflow).

---

## 6. Asset status state machine

Keep this as a small, explicit state table in `asset-catalog` rather than
letting any service set `statusId` freely:

```
AVAILABLE → RESERVED → ISSUED/ASSIGNED → (RETURNED →) AVAILABLE
                                        → UNDER_MAINTENANCE → AVAILABLE / RETIRED
                                        → LOST / STOLEN / DAMAGED → RETIRED / AVAILABLE (recovered)
ASSIGNED/AVAILABLE/MAINTENANCE → RETIRED → DISPOSED
```

A single `assets.transitionStatus(assetId, toStatusCode, actorId, reason)`
method is the only way status changes — it validates the transition is legal,
writes the `AssetHistory` row, and is what the audit interceptor hooks into.
This is what prevents, e.g., a disposed asset from silently becoming
"available" again through a stray update somewhere.

---

## 7. Auth & future SSO

- Phase 1: local email/password auth via Passport's local strategy, bcrypt
  password hashing, JWT access tokens (short-lived) + refresh tokens.
- Designed so Google Workspace and Microsoft Entra ID can be added as
  additional Passport strategies later (`passport-google-oauth20`,
  `passport-azure-ad`) without touching the permission/session model — they'd
  just be alternate ways to arrive at the same `User` record, matched on email.
- LDAP/Active Directory sync (Section 61) is a scheduled job in `users` module
  that reconciles department/position/status from the directory, not a login
  strategy — most schools want staff directory data synced but still want
  local session control.

---

## 8. QR / barcode design

- `Asset.qrToken` is a random opaque string — **not** the database id and
  **not** the asset tag — generated at registration.
- The QR code encodes a URL like `https://sarms.yourschool.org/scan/{qrToken}`.
- That endpoint requires authentication. What it shows is permission-scoped:
  a teacher scanning it sees name/status/location; an unauthorized scan (no
  session) sees nothing but a login prompt. This satisfies Section 37's
  requirement to never expose asset details through a bare unauthenticated
  scan.
- Barcodes (Code128) can encode the human-readable `assetTag` directly, since
  that's already unique and meant to be visible on a printed label.

---

## 9. Deployment: local VM now, internet later

```
docker-compose.yml
├── postgres      (persistent volume)
├── redis         (for BullMQ notification/overdue jobs)
├── api           (NestJS app)
├── web           (your frontend build, served as static files or its own container)
└── nginx         (reverse proxy, TLS termination point)
```

**Phase 1 — internal only:**
Run the whole compose stack on the VM, Nginx listens on the VM's LAN IP,
firewall blocks everything except your organization's network/VPN.

**Phase 2 — internet-facing:**
Point a domain at the VM, get a TLS cert (Let's Encrypt via Nginx's certbot
companion), open port 443 through the firewall, keep everything else — the app
code, the database schema, the container layout — identical. This is exactly
why containerizing from day one matters: the migration is a networking change,
not a re-architecture.

Backups: a nightly `pg_dump` of the Postgres volume plus the attachments
directory, shipped off the VM (even just to a separate disk or cloud storage
bucket) — Section 70 of your spec is right that backups living only on the same
machine as production don't count as backups.

---

## 10. Build order (maps to your own Phase 1 in the spec)

1. Auth, users, roles/permissions, departments, locations, academic years —
   nothing else works without these.
2. Asset catalog (categories/statuses/conditions) + asset master record +
   asset detail/history read model.
3. Custody ledger: assignments + transfers + the status state machine.
4. Requests + approval workflow engine (start with one hard-coded default
   workflow, then build the admin UI to configure others).
5. Issuance + acknowledgement.
6. Search, dashboards, QR generation/lookup.
7. Audit log + notifications (email) — wire these in as you build 2–6, not as
   an afterthought; retrofitting audit logging is painful.
8. Phase 2: vendors, procurement, maintenance, incidents, disposal, stocktake,
   reports.

Given the screens you already have from Stitch, I'd start wiring up #1–#3
against the login, dashboard, asset register, and asset detail screens first —
that gives you an early end-to-end slice (login → see real assets → see real
history) to sanity-check the schema against actual data before the more
complex request/approval flow.
