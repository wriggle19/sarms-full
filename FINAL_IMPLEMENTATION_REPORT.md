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
