# SARMS — Final Implementation Report

Date: 2026-09-14
Scope: production-completion pass over the existing SARMS v4.0 codebase (audit-first; no rewrites).

## 1. What was already complete (verified in code, not assumed)

- Authentication: bcrypt cost 12, JWT auth (8h expiry), login rate limiting 5/min, global throttle 200/min.
- Authorization: global `PermissionGuard` + `@RequirePermission` on nearly all routes; record-level checks (request ownership, approval chain) in services.
- Web security: helmet, CORS restricted to `CORS_ORIGIN`, global `ValidationPipe` with `whitelist`/`forbidNonWhitelisted`, Prisma parameterized queries.
- File uploads: MIME allowlist, 10 MB cap, executable extension blocklist, random on-disk names, JWT-gated downloads.
- Asset lifecycle: explicit `ASSET_STATUS_TRANSITIONS` graph enforced in `AssetsService.transitionStatus`.
- Custody ledger: append-only `AssetAssignment`/`AssetTransfer` model with serializable-transaction issuance (double-issue impossible; verified by test).
- Requests/approvals, issuance, acknowledgement, reservations, stocktake, maintenance, incidents, disposal, procurement, vendors, notifications, scheduler (overdue/warranty scans), reports, audit logging, bulk ops, imports — all present with guards.
- Docker: API/web/nginx/postgres compose with required secrets, migration-on-start entrypoint, health endpoint + healthchecks.


## 2. What was fixed in this pass

| Item | Files | Verification |
|---|---|---|
| JWT secret had insecure `'change-me-in-env'` fallback | `auth.module.ts`, `jwt.strategy.ts` | Now `getOrThrow`; `main.ts` refuses production start without `JWT_SECRET`. Build passes. |
| Docker compose hardcoded credentials | `docker-compose.yml` (new) | Secrets via env-file; missing vars abort startup. |
| No startup migrations / health endpoint | `entrypoint.sh`, `Dockerfile`, `main.ts` | `prisma migrate deploy` before boot; `GET /health`; compose healthchecks. |
| Missing audit history on maintenance-complete / incident-resolve / disposal | `maintenance.service.ts`, `incidents.service.ts`, `disposal.service.ts` | History rows written with the state change. |
| `currentCustodianId` not maintained | `custody.service.ts` | Set on issue, cleared on return, set/cleared on transfer. Unit-tested. |
| Attachment list/delete/rename had no permission check (IDOR risk) | `attachments.service.ts`, `attachments.controller.ts` | Per-module permission map enforced on all attachment endpoints. 8 unit tests. |
| Finance data exposed to any `assets.view` user | `assets.controller.ts`, `assets.service.ts`, `reports.controller.ts` | Finance fields nulled for non-`finance.view` users on asset list/detail/scan, stripped from asset-register CSV; `by-department` requires `finance.view`. Unit-tested. |
| Credentials in tracked docs | `SYSTEM_STATUS_AND_REVERT.md`, `sarms-api/README.md`, `sarms-web/README.md` | Redacted; grep confirms zero credential strings. **Rotation note:** previously documented seed/dev credentials must be treated as public and changed. |
| No `.env` templates | `.env.docker.example`, `sarms-api/.env.example`, `sarms-web/.env.example` | Created/verified. |
| nginx didn't serve frontend | `sarms-api/nginx/default.conf`, `docker-compose.yml` | Web served on `/`, API proxied on `/api`. |
| **No automated tests at all** | 4 new spec files + Jest config | `npx jest`: **4 suites, 26 tests, all passing.** |

## 3. Tests added

- `asset-status.transitions.spec.ts` — lifecycle graph: no exit from DISPOSED, no AVAILABLE→DISPOSED jump, blocking statuses can't be issued.
- `custody.service.spec.ts` — double-issuance refusal, blocking-status refusal, deleted-asset refusal, unknown-condition refusal, custodian pointer maintenance, GOOD→AVAILABLE vs DAMAGED→MAINTENANCE return routing, duplicate-return refusal.
- `attachments.service.spec.ts` — per-module access control on list/delete/rename, entity-type allowlist, positive-id validation, MIME/size upload limits.
- `assets.service.spec.ts` — finance-field sanitization (finance.view vs plain user, non-mutation).

## 4. Database changes

None required this pass — schema already had soft-delete, indexes on asset_tag/serial/status/room/department, unique constraints. `entrypoint.sh` runs `prisma migrate deploy` on container start.

## 5. Verified commands

- `npx tsc --noEmit` — clean.
- `nest build` — success.
- `npx jest` — 26/26 passing.

## 6. Remaining known limitations
## 5b. Test suite totals (final)

| Suite | Tests | Status |
| --- | --- | --- |
| Unit (`npm test`) | 31 | ✅ all pass |
| Integration (`jest custody.integration` vs live Postgres 16) | 5 | ✅ all pass |

Key integration verifications against a real database: dual-officer issuance
race (exactly one wins), DISPOSED-asset issuance refusal, DB-level unique asset
tag, `currentCustodianId` correctness across issue→return, append-only history.



1. **Integration tests: NOW IMPLEMENTED** — `src/custody/custody.integration.spec.ts` runs against a live PostgreSQL instance (skips when `DATABASE_URL` is unset). **Verified: 5/5 pass**, including the §6 concurrency test (two simultaneous issuances of the same asset; exactly one succeeds). Remaining gap: browser-driven E2E automation of the §40 scenario.
2. **Scheduler: NOW AUTOMATED** — `SchedulerService` (@nestjs/schedule, hourly) runs overdue + warranty scans in-process; configurable via `SCHEDULER_ENABLED` / `SCHEDULER_INTERVAL_MS`. Manual triggers remain at `POST /scheduler/run-*`. In multi-replica deployments, enable the timer on one replica only.
3. **Email** requires SMTP env vars; in-app notifications work without them.
4. **HTTPS** terminates outside compose (add certs or a load balancer).
5. **Restore drill**: backup/restore is documented; an actual `pg_dump`→restore rehearsal against a live database is an operational step for the pilot environment.
6. **Frontend bundle** is ~1.3 MB minified (gzip ~372 kB); functional but would benefit from code splitting.

## 7. Recommended next-phase features

- Browser-driven E2E scenario automation (§40 of the requirements).
- Testcontainers-based integration CI so the live-DB suite runs in the pipeline.
- SMS/WhatsApp notification channel; per-event notification preferences UI.
- Depreciation schedule background calculation.
- Excel export via spreadsheet library (CSV exists today).
- Frontend code splitting (dynamic import of heavy QR/barcode libs).

---

## Addendum — Production-Hardening Pass (2026-09-15)

**Priority 0 (broken):** imports.service.ts compile errors fixed (explicit Map typing); .env.example verified complete (+ scheduler/seed vars); seed now refuses NODE_ENV=production without SEED_ALLOW_PRODUCTION=true --force AND SEED_ADMIN_PASSWORD (both refusal paths tested live).

**Priority 1 (operations):** global AllExceptionsFilter (uniform {statusCode,message,error}, no stack leakage in prod); RequestIdMiddleware (correlation ids + access logs); GET /health (200 healthy / 503 degraded verified at runtime; app fails fast at boot if DB unreachable); password-reset throttle 3/10min; verified no secret has a working default (config.getOrThrow).

**Priority 2 (tests):** 26 unit tests + 5 integration tests on live Postgres (incl. the dual-officer issuance race — exactly one wins) + 9 e2e tests (login → request → 2-step approval → finalize issue → duplicate-issue refusal → return → custodian cleared → audit RBAC). Real bugs caught: IT-officer role lacked requests.approve while being the default workflow's designated approver (fixed in seed); nest build emitted dist/src/main.js while start/Docker expected dist/main.js (added tsconfig.build.json, verified).

**Priority 3 (CI):** .github/workflows/ci.yml — API job (tsc, unit, build, Postgres, migrate, seed, e2e) + web job (build). Push/PR to main.

**Priority 4 (gaps):** role-scoped dashboard (fleet overview vs personal My Requests; finance row via new server-guarded /dashboard/finance-summary); exchangeRate + server-computed baseCurrencyAmount on Asset (additive migration, originals never mutated, converted amount never client-submitted); printable clearance certificate with session-resolved asset list (XSS-escaped); nav items gated on exact server-side permissions (bulk=assets.transfer, imports=assets.create, audit=audit.view, settings=roles.manage, ...).

**Priority 5 (performance):** React.lazy route splitting — initial bundle 1.3MB → 255KB; AssetDetail 968KB → 10KB with on-demand QR/barcode codecs (justified on-demand bwip-js chunk documented in vite.config.ts); 5 justified Asset indexes added (currentCustodianId, responsibleDepartmentId, vendorId, purchaseOrderId, academicYearId) via additive migration; receiveItem() loop reviewed — acceptable at tens-of-units-per-PO, no N+1 reads.

**Final verification:** tsc clean; 31/31 unit+integration; 9/9 e2e; both builds succeed; prisma validate + schema/DB diff empty; no .env tracked; seed guard tested; health 200/503 tested.

**Deferred / noted:** no asset-edit endpoint exists (create/status/delete only) — next phase; bwip-js → lighter Code128-only library is an optional win; observe CI on first push (all steps validated locally).


---

## Addendum 2 — "Dashboard not coming up" root cause + browser verification (2026-09-15)

**Root cause of the reported blank/broken dashboard (two compounding causes):**

1. **A stale API process was still bound to :3000** — an older `node` process built before this session's changes. Proof: `GET /health` returned the NestJS default 404 shape instead of the new health payload. That old build therefore had **no `/dashboard/finance-summary` route**.
2. **The new Dashboard code treated that as fatal**: it issued `Promise.all([summary, recent-activity, finance-summary])` and a single rejection (the 404) rejected the whole batch → the page rendered only "Could not load dashboard data." ("dashboard not coming up") for any user holding `finance.view` (i.e. the admin). This regression was introduced by the Priority 4.1 dashboard work and is the real defect to fix.

**Fixes applied:**
- `Dashboard.tsx` now settles **each call independently**: the core summary is required, while `recent-activity` and the finance panel degrade silently (empty/absent) instead of blanking the page. Optional UI can no longer take down the dashboard.
- Restarted the API on :3000 from the current build (stale PID 17803 terminated) — `/health` now 200 and all three dashboard endpoints return 200.
- Added a missing `public/favicon.svg` + `<link rel="icon">` in `index.html` — removed the last console 404.

**Real-browser verification** (headless Chrome via puppeteer-core driving the actual Vite dev server, since API-level checks cannot prove rendering):

| Check | Result |
|---|---|
| Login as `admin@sarms.local` → dashboard | FLEET OVERVIEW rendered, 18 nav items, no error banner |
| Login as `teacher@sarms.local` → dashboard | Renders, 8 nav items (permission-scoped correctly) |
| Sweep of all 23 routes as admin | All render content; no page errors, no console errors, no 4xx/5xx |
| `/assets/:id` lazy QR/barcode panel | QR + barcode labels render, QR SVG present, no fallback, no stuck loader |
| `/scan/:qrToken` deep link | Shows the real asset (tag, status, condition, dept, custodian) |
| `/clearance` → Generate Clearance Certificate | Popup opens with correct title/employee/department/date text |
| Console/network errors after fixes | **none** |

**Re-verified after these fixes:** API `tsc` clean · WEB `tsc` clean · API unit+integration 31/31 · e2e 9/9 (scratch Postgres recreated, migrated, seeded) · `npm run build` succeeds with no chunk warning · `/health` 200 on :3000.

**Environment note:** the previously running API was stale and had to be replaced. In development use `npm run start:dev` (or `npm run build && npm run start`) so the served build always matches the source; the container entrypoint runs `prisma migrate deploy` before starting.

