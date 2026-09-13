# SARMS Web

React + Vite frontend for SARMS, wired to the real `sarms-api` backend.

## Pages (all implemented, all calling real endpoints)

Login, Dashboard (live counts), Asset Register (search + list), Asset Detail
(history timeline + Transfer/Return actions), Register New Asset, Requests
(submit + "my requests"), Approvals (approve/reject queue), Issuance Queue
(select a specific asset and finalize an approved request), Maintenance
(report/complete), Incidents (report/resolve lost/missing/stolen/damaged),
Disposal (retire→dispose), Procurement (vendors + purchase orders + receive
into individually-tagged assets), and Stocktake (start a scoped stocktake,
scan QR tokens, close it out).

Styled to match the Stitch design tokens (navy/institutional palette).

## Run it locally (alongside the backend)

1. Make sure `sarms-api` is running on `http://localhost:3000`.
2. `npm install`
3. `cp .env.example .env`
4. `npm run dev`
5. Open `http://localhost:5173`, log in with the seeded admin account
   (`admin@sarms.local` / `ChangeMe123!`).

## Run it with Docker (alongside the backend's docker-compose)

Add this service to `sarms-api/docker-compose.yml`:
```yaml
  web:
    build: ../sarms-web
    restart: unless-stopped
    ports:
      - "8080:80"
```
Set `VITE_API_URL` correctly before building the image — Vite bakes it in at
build time, not at container start, so it needs to point at wherever the
backend is actually reachable from the browser (not `localhost` once this is
on a VM).

## Still not built

A dedicated screen for editing approval workflows (currently
admin-configured via the API directly — see `sarms-api`'s
`/approval-workflows` endpoints), and a proper camera-based QR scanner for
Stocktake (currently a text input you paste/type the token into — swap in a
library like `html5-qrcode` when you're ready for real device scanning).
