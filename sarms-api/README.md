# SARMS API

School Asset & Resource Management System — backend (NestJS + PostgreSQL + Prisma).

See `../ARCHITECTURE.md` for the full design rationale.

## Modules (all implemented)

Auth (JWT login), users, roles/permissions (RBAC), departments, locations
(campus/building/floor/room), academic years, asset catalog
(categories/statuses/conditions), assets (register/search/detail/QR
lookup/status state machine), custody (issue/return/transfer), requests,
the configurable approval workflow engine, issuance, asset history,
dashboard summary, notifications (in-app stub), vendors, procurement
(purchase orders + receiving into individually-tagged assets), maintenance,
incidents (lost/missing/stolen/damaged), disposal, and stocktake
(scoped snapshot + QR scan reconciliation).

## First-time setup (local machine, no Docker)

1. Install Node.js 20 and PostgreSQL 16.
2. `npm install`
3. `cp .env.example .env` and adjust if your Postgres credentials differ.
4. `createdb sarms`
5. `npx prisma generate && npx prisma migrate dev --name init`
6. `npm run seed` — prints the seeded admin login (`admin@sarms.local` /
   a placeholder password (see seed output)). **Change that password immediately.**
7. `npm run start:dev`
8. `http://localhost:3000/api/docs` — full interactive endpoint list (Swagger).

## Running with Docker Compose

1. `docker compose up -d --build` (from the project root, one level up).
2. `docker compose exec api npx prisma migrate deploy`
3. `docker compose exec api npm run seed`
4. Reachable through Nginx on port 80 of the VM.
5. Going internet-facing later: point a domain at the VM, add a TLS cert,
   uncomment the `443` line in `docker-compose.yml`, open port 443 on the
   firewall. Nothing else changes.

## A note on this environment's limits

This code was written and structurally checked in a sandbox that can't reach
Prisma's binary download servers, so `prisma generate` and a full `nest build`
against real, schema-specific Prisma types could not be run here — only a
general TypeScript syntax check (which passes clean). Run
`npx prisma generate` and `npm run build` yourself as the first thing you do.
