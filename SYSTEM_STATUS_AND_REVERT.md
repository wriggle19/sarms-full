# SARMS — System Status & Revert Point (DO NOT DELETE)

## Baseline tag: `PHASE2-BASELINE`
- Commit: `566b8d8` (main, pushed to origin)
- Tag message: "Baseline before completing remaining phases"
- Pushed to: `origin/PHASE2-BASELINE` (verified)
- Working tree at tag time: clean (`git status` = nothing to commit)
- Date captured: 2026-09-13

## How to revert (if anything breaks)
```bash
cd /Users/administrator/sarms-full
# 1. See what changed since baseline
git status --short
git diff --stat PHASE2-BASELINE..HEAD
# 2. Full revert of code to baseline (keeps DB data):
git stash push -m "pre-revert-save" --include-untracked
git checkout PHASE2-BASELINE -- sarms-api/src sarms-api/prisma sarms-web/src sarms-api/package.json sarms-web/package.json
# 3. Nuclear revert (code only, back to exact baseline commit):
# git reset --hard PHASE2-BASELINE
# 4. Rebuild + restart after any revert:
cd sarms-api && npx prisma generate && npm run build
# restart: node dist/src/main  (port 3000)
cd ../sarms-web && npm run build
# restart: npx vite --port 5173 --host
```
DB note: code revert does NOT revert DB schema/data. New tables added after baseline
are additive-only (nullable columns, new tables) so old code keeps running.
If a new migration breaks the DB: `cd sarms-api && npx prisma migrate resolve --rolled-back <migration_name>`
then restore DB from the pre-phase backup (pg_dump taken before phase work).

## DB connection (dev machine)
- Postgres 16 (Homebrew), localhost:5432, db `sarms`, role `sarms/sarms`
- API .env: DATABASE_URL=postgresql://sarms:sarms@localhost:5432/sarms, JWT_SECRET, PORT=3000
- Web .env: VITE_API_URL=http://localhost:3000

## Live services at baseline
- API: http://localhost:3000 (docs /api/docs → 200), pid recorded at time ~92531 lineage
- Web: http://localhost:5173 (200)
- Logins (all password `ChangeMe123!`): admin@sarms.local / teacher@sarms.local / officer@sarms.local

## Working functionalities at baseline (verified live, DO NOT REGRESS)
1. Auth: bcrypt(12) login → JWT (8h, permissions embedded); GET/PATCH /auth/me; POST /auth/me/change-password (current-pw required); activate/deactivate users; lastLoginAt.
2. RBAC: Role/Permission/UserRole, PermissionGuard + @RequirePermission, JWT refresh picks up permission changes. Settings → Roles permission-matrix edit works.
3. Org: Departments CRUD; Campuses→Buildings→Floors→Rooms CRUD; AcademicYears CRUD + set-current + /:id/outstanding; Positions exist on User.
4. Catalog: Categories (self-parent = subcategories), Statuses, Conditions CRUD.
5. Assets: POST /assets auto assetTag (prefix+sequence) + qrToken; QR encodes {origin}/scan/:qrToken; Code128 barcode from assetTag; GET /assets?search= matches tag/serial/qrToken/serviceTag/model/manufacturer; GET /assets/scan/:qrToken full detail; PATCH :id/status/:code via transition graph; DELETE soft-delete.
6. Custody ledger: AssetAssignment (PERSON/ROOM/DEPARTMENT/POOL, expected/actual return, conditionAtIssue/Return, acknowledgedAt/signatureUrl) + AssetTransfer (from/to, reason, by/approvedBy) + AssetHistory timeline + AuditLog interceptor. currentRoomId/currentCustodianId are read pointers only.
7. Requests: REQ-YYYY-NNNNNN, 11 types, priority, academic-year, specific-asset; SUBMITTED→PENDING_APPROVAL→APPROVED→ISSUED; cancel; mine/all; self-approval blocked.
8. Approvals: ApprovalWorkflow+Step (LINE_MANAGER/DEPARTMENT_HEAD/ROLE/SPECIFIC_USER, minValueThreshold), decide APPROVED/REJECTED/CHANGES_REQUESTED + comment; pending queue.
9. Issuance: queue of APPROVED; finalize only if APPROVED + asset AVAILABLE; acknowledge stores URL+timestamp.
10. Returns: condition recorded; damaged/poor → MAINTENANCE.
11. Maintenance: report → MAINTENANCE status; complete → AVAILABLE or RETIRED + condition update.
12. Incidents: LOST/MISSING/STOLEN/DAMAGED, policeReportNumber, asset stays in DB; resolve (+recovered → AVAILABLE).
13. Disposal: RETIRED→DISPOSED only; reason/bookValue/method/vendor/proceeds/certificate.
14. Procurement: Vendors CRUD; POs with items; receiveItem creates N individually tagged/QR assets.
15. Stocktake: scoped create (ROOM/DEPT/BLDG/CAMPUS/CATEGORY/ALL) snapshots PENDING items; scan by qrToken → VERIFIED/WRONG_LOCATION/UNREGISTERED; close marks PENDING→MISSING.
16. Clearance: users/:id/outstanding-assets; /clearance blocks finalize while outstanding > 0.
17. Room inventory: rooms/:id/inventory; history forAsset/forUser/forRoom.
18. Dashboard: summary (total, byStatus, pendingApprovals, overdue count) + recent-activity.
19. Search: global search page + "Scan a code" box (token/URL/tag/serial → detail).
20. Settings UI: Users/Departments/Locations/Years/Catalog/Roles tabs, permission-gated.
21. Profile: /profile edit name/phone/photo + change password; sidebar user card → /profile; logo → /.
22. Builds green: `nest build` EXIT:0; `tsc && vite build` EXIT:0.

## Known gaps AFTER baseline (to be completed — see PHASE_COMPLETION_PLAN.md)
P1: login throttling, password-reset, helmet/secure headers, login/logout audit.
P2: asset finance fields (purchaseDate, projectCode, usefulLife, salvage/book value, depreciation, assetClass, image, barcode), warranty detail fields, maintenance detail fields.
P3: attachments upload (validated, private URLs), reservations + availability, school calendar, notification templates admin + dispatch hooks + overdue/warranty scheduler endpoint.
P4: role dashboards (finance/procurement/dept/employee), reports export CSV + filters, audit-log UI, workflow/numbering/settings admin UI.
P5: CSV import (preview→import), bulk ops, QR label print, onboarding/offboarding checklist + clearance certificate, docs + backup procedure.
Out of scope (scaffold only): SSO/LDAP/OAuth, SMS, MDM/ERP/MIS integrations, PWA.
Stack: NestJS+Postgres (spec asked PHP+MySQL — documented deviation, not changed).

---
## Update 2026-09-13 (final, after phase-completion work)

NEW since PHASE2-BASELINE (additive migration 20260913164858_phase2_additive):
- Password reset: POST /auth/password-reset/request + /reset (dev returns token inline; SMTP via MailService env)
- Rate limiting: ThrottlerGuard on /auth/login (5/min)
- Attachments: POST /attachments (multer upload to ./uploads, validated), GET /attachments/:id/download
- Reservations (§50): /reservations CRUD + approve/reject/cancel, availability checks
- Calendar (§45): /calendar CRUD (SchoolCalendarEvent)
- Audit-log UI API (§43): GET /audit-logs
- Reports (§40): /reports/asset-register[.csv], /overdue[.csv], /warranties-expiring, /by-department, /maintenance-costs, /compliance
- Bulk ops (§69): POST /bulk/transfer, /bulk/status; GET /bulk/qr-labels
- CSV import (§47): /imports/preview + /imports/commit
- Notifications: dispatch service + GET /notification-templates admin endpo
---
## Update 2026-09-13 (final, after phase-completion work)

NEW since PHASE2 ex##nd
NEW since PHASE2-BASELINE (additive migration 202609131, t- Password reset: POST /auth/password-reset/request + /reset (dev returns tokty- Rate limiting: ThrottlerGuard on /auth/login (5/min)
- Attachments: POST /attachments (multer upload to ./uploar- Attachments: POST /attachments (multer upload to ./pa- Reservations (§50): /reservations CRUD + approve/reject/cancel, availability checks
- Calendar (§4er- Calendar (§45): /calendar CRUD (SchoolCalendarEvent)
- Audit-log UI API (§43): GEs - Audit-log UI API (§43): GET /audit-logs
- Reports (on- Reports (§40): /reports/asset-rnce / pur- Bulk ops (§69): POST /bulk/transfer, /bulk/status; GET /bulk/qr-labels
- CSV import (§47): /imports/preview + /imports/commit
- Non- CSV import (§47): /im reverse.
