# SurplusLink AI — single-folder project

This folder contains the complete integrated application: FastAPI backend, React/Vite frontend, local runtimes, deployment configs, and documentation.

```text
E:\SurplusLinkAI
├── backend\          FastAPI + SQLAlchemy/Alembic + tests + local Python venv
├── frontend\         React + Vite + local npm packages + Vercel config
├── tools\node\       Portable Node.js runtime (no system Node install needed)
├── reference\        Read-only source snapshots + SOURCE_MAP.md
├── render.yaml       Render Blueprint for the backend
├── SURPLUSLINK.md    Migration and verification summary
├── AGENTS.md         Project instructions
├── run-backend.ps1   Start the FastAPI server on port 8000
├── run-frontend.ps1  Start the Vite dev server on port 3000
└── verify.ps1        Run backend tests + frontend type-check + production build
```

## Run locally

Open PowerShell in `E:\SurplusLinkAI`:

```powershell
# Terminal 1 — backend
.\run-backend.ps1

# Terminal 2 — seed once, then frontend
curl -X POST http://127.0.0.1:8000/api/demo/seed
.\run-frontend.ps1
```

Open `http://127.0.0.1:3000`. All demo accounts use password `surplus123`.

## Verify everything

```powershell
.\verify.ps1
```

Expected result: backend tests pass, TypeScript check is clean, and the Vite production build succeeds.

## Documentation

- `SURPLUSLINK.md` — what was integrated and what was verified
- `backend\README.md` — endpoints, demo accounts, Alembic, Render deployment
- `frontend\README.md` — environment variables, API wiring, Vercel deployment
- `reference\SOURCE_MAP.md` — every original source file mapped to its active FastAPI/React replacement

## Note on legacy code

The original Builders Theory matching engine, SurplusLink AI v2 Flask extractor, and the attached volunteer QR Flask files are preserved in `reference\` as read-only source snapshots. The full legacy Serverpod package remains outside this folder under `E:\Backend` and is not part of the active stack.
