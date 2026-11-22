# SurplusLink AI — unified stack migration

This workspace is being moved off the old Serverpod/Dart + Flask setup onto one integrated application:

- **Frontend:** React + Vite in `E:\SurplusLinkAI\frontend` (deployed on Vercel)
- **Backend:** Python + FastAPI in `E:\SurplusLinkAI\backend` (deployed on Render)
- **Database:** PostgreSQL (local) or Neon via `DATABASE_URL`

## Run locally

```powershell
# 1. Backend
cd E:\SurplusLinkAI\backend
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000

# 2. Seed demo data once
curl -X POST http://127.0.0.1:8000/api/demo/seed

# 3. Frontend
cd E:\SurplusLinkAI\frontend
npm run dev
```

Open `http://127.0.0.1:3000`. All seeded demo accounts use password `surplus123`. Key logins:

| Role | Email |
| --- | --- |
| donor | `donor@campus.edu` |
| NGO | `ngo@robinhood.org` |
| volunteer | `volunteer@campus.edu` |
| admin | `admin@surpluslink.ai` |

## What is integrated

- Bearer JWT auth from `/api/auth/login`; React stores and sends the token automatically.
- AI extraction through `/api/ai/extract` with Gemini/OpenAI/xAI and deterministic local fallback.
- Dart matching engine ported to `/api/matching/suggest` (proximity 35, timing 25, capacity 25, category 15, reliability bonus). NGO operating hours are converted from UTC deadlines using `MATCHING_TIME_ZONE` (default `Asia/Kolkata`).
- Donation lifecycle, rescue sessions, WebSockets, volunteer pickups, and impact dashboard all live in the FastAPI app.
- Volunteer handover uses a single-use `SL-{pickup_id}-{8 hex}` token with QR data URL, SHA-256 storage, and a 2-hour expiry. The React handover UI now accepts the token rather than a 6-digit PIN.
- Frontend mock mode is disabled by default; it remains available with `VITE_USE_MOCK_DATA=true` for offline demos.
- Original sources are preserved under `reference\` as read-only snapshots, with a complete file-by-file mapping in `reference\SOURCE_MAP.md`. `verify.ps1` checks that every snapshot is present before running the rest of the suite.

## Source snapshots connected

```text
reference\builders-theory\   -> backend\app\matching.py, routers\matching.py, websocket events
reference\surpluslink-v2\    -> backend\app\ai_extraction.py, routers\ai.py
reference\flask-volunteer-qr\-> backend\app\routers\pickups.py, models.py, frontend handover UI
```

These are provenance copies only; the active application remains `backend/` + `frontend/`. The full mapping is in `reference\SOURCE_MAP.md`.

## Verification completed

```text
Backend:  .\.venv\Scripts\python.exe -m pytest -q
          -> 6 passed

Frontend: tsc --noEmit
          -> clean
          vite build
          -> production build succeeded

Live HTTP: uvicorn on 127.0.0.1:8011 with temporary SQLite DB
           -> health, seed, auth, listing, accept, matching, pickup,
              QR generation, handover verification, and impact all succeeded
           -> matching returned 2 ranked eligible recipients at 00:08 UTC
              after the local-timezone fix
```

## Deployment

- Backend blueprint: `E:\SurplusLinkAI\render.yaml` (Render, single web instance because the realtime hub is in-process).
- Frontend config: `E:\SurplusLinkAI\frontend\vercel.json`; set `VITE_API_BASE_URL` to the Render service URL.
- Backend setup and endpoint reference: `E:\SurplusLinkAI\backend\README.md`
- Frontend setup: `E:\SurplusLinkAI\frontend\README.md`

## Legacy code

The old Serverpod/Dart directories remain outside this integrated folder under `E:\Backend` for reference and are not part of the active stack. They have not been deleted or moved because they still contain prior uncommitted work. Archive or remove them only after you confirm the new stack is running in your target environment.
