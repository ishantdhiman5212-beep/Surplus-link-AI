# SurplusLink AI — FastAPI backend

This is the single backend authority for the unified Python + React stack. It replaces the old Serverpod/Dart and standalone Flask services: REST, WebSockets, AI extraction, matching, volunteer pickups, QR handover, and impact reporting all live here.

## Architecture

| Concern | Implementation |
| --- | --- |
| API | FastAPI (`app/main.py`) |
| Persistence | SQLAlchemy 2 async + Alembic |
| Databases | Local Postgres or Neon via `DATABASE_URL`; SQLite only for tests |
| Auth | Bearer JWT from `/api/auth/login` |
| Realtime | In-process `EventHub` + WebSockets (single backend worker) |
| AI extraction | Ported `app/ai_extraction.py` behind `POST /api/ai/extract` |
| Matching | Ported Dart engine in `app/matching.py` (35/25/25/15 + reliability) |
| Handover | Single-use `SL-{pickup_id}-{8 hex}` tokens, SHA-256 hashed, 2-hour expiry |

## Local setup

```powershell
cd E:\SurplusLinkAI\backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Set `DATABASE_URL` in `.env`, then create the schema and start the server:

```powershell
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Docs are available at `http://127.0.0.1:8000/docs`; health check at `http://127.0.0.1:8000/health`.

For a throwaway local database you can use SQLite instead:

```powershell
$env:DATABASE_URL = "sqlite+aiosqlite:///./dev.db"
$env:CREATE_TABLES_ON_STARTUP = "true"
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

## Demo data

Seed once into an empty database:

```powershell
curl -X POST http://127.0.0.1:8000/api/demo/seed
```

All seeded accounts use password `surplus123`:

| Role | Email | Organisation |
| --- | --- | --- |
| donor | `donor@campus.edu` | Main Auditorium Catering |
| donor | `chef@spiceroute.com` | Spice Route Restaurant |
| NGO | `ngo@robinhood.org` | City Robin Hood Army |
| NGO | `roti@rotibank.org` | Roti Bank Foundation (`roti`) |
| NGO | `sewa@kitchen.org` | Sewa Community Kitchen (`sewa`) |
| NGO | `anna@shelter.org` | Annapurna Shelter Home (`anna`) |
| volunteer | `volunteer@campus.edu` | — |
| volunteer | `rider.arjun@surpluslink.org` | Arjun Verma |
| volunteer | `priya.rider@surpluslink.org` | Priya Sharma |
| admin | `admin@surpluslink.ai` | Platform Dispatch Admin |

## Main endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Render/Vercel health check |
| `POST` | `/api/auth/login` | Obtain Bearer JWT |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/demo/seed` | Seed demo users/orgs/listings |
| `GET` | `/api/users` | Public demo user directory |
| `GET` | `/api/organisations` | Donor and recipient organisations |
| `POST` | `/api/ai/extract` | Multi-tier food description extraction |
| `GET/POST` | `/api/donations` | List or create food listings |
| `POST` | `/api/donations/{id}/accept` | NGO accepts a listing and opens a session |
| `GET` | `/api/matching/suggest` | Ranked eligible recipient NGOs |
| `GET/POST` | `/api/rescue-sessions` | Live rescue sessions and join codes |
| `GET` | `/api/pickups` | Volunteer pickup queue |
| `POST` | `/api/pickups/start` | Assign volunteer to a listing |
| `POST` | `/api/pickups/{id}/qr` | Generate handover token + QR data URL |
| `POST` | `/api/pickups/{id}/verify` | Single-use handover verification |
| `GET` | `/api/dashboard/impact` | Impact metrics and map pins |
| `WS` | `/ws/sessions/{id}`, `/ws/donations` | Realtime event streams (`?token=...`) |

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_api.py -q
```

Run the full suite with `pytest -q`. It covers seed → auth → AI extraction → listing → session → matching → pickup → QR → handover → impact, including duplicate-token rejection, recipient organisation resolution, Builders Theory scoring weights, timezone handling, and the Flask QR token contract. Source provenance is documented in `../reference/SOURCE_MAP.md`.

## Deployment (Render)

Use `E:\SurplusLinkAI\render.yaml` as a Render Blueprint. It installs requirements, applies Alembic migrations, and starts Uvicorn with the injected `PORT`. Set `DATABASE_URL`, `CORS_ORIGINS`, and any AI provider keys in the Render dashboard. `JWT_SECRET` is generated automatically by the blueprint.

Because the realtime hub is in-process, run **one backend web instance**. Multiple workers would not share WebSocket subscribers.

## Notes

- `DATABASE_URL` accepts `postgresql://`, `postgres://`, or `postgresql+psycopg://`. The app normalizes it for async SQLAlchemy and Alembic.
- Naive datetimes are treated as UTC; `app/timeutils.py` keeps SQLite and Postgres behaviour consistent.
- NGO operating hours are local wall-clock times. Matching converts UTC deadlines with `MATCHING_TIME_ZONE` (default `Asia/Kolkata`, fallback offset `MATCHING_UTC_OFFSET_HOURS=5.5`).
- No API keys are required: extraction falls back to the deterministic local parser when providers are unavailable.
