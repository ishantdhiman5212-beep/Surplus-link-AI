# SurplusLink AI — React frontend

Vite + React client for the unified FastAPI backend. The client uses a Bearer JWT stored in `localStorage`, calls the FastAPI contracts in `src/services/api.ts`, and maps backend rows into the existing UI model through `src/services/adapters.ts`.

## Local development

```powershell
cd E:\SurplusLinkAI\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The dev server runs on `http://127.0.0.1:3000` and proxies `/api` and `/health` to `http://127.0.0.1:8000`. Start and seed the backend first (see `E:\SurplusLinkAI\backend\README.md`).

Quick demo sign-in buttons map to real seeded backend accounts; all use password `surplus123`. Manual login also accepts any seeded email plus that password.

## Modes

| `VITE_USE_MOCK_DATA` | Behaviour |
| --- | --- |
| `false` | Calls FastAPI at `VITE_API_BASE_URL`; recommended |
| `true` | Fully offline using the local simulation and heuristic AI extraction |

Even in live mode, the UI degrades to local state if the backend health check fails, and AI extraction falls back to the bundled heuristic parser if `/api/ai/extract` is unavailable.

## Key wiring

- `src/services/api.ts` — auth, listings, organisations, users, matching, pickups, QR, impact, WebSocket stream
- `src/services/adapters.ts` — backend rows → existing React `FoodListing`, impact, feed, and match models
- `src/context/AuthContext.tsx` — JWT login and preset account mapping
- `src/context/RescueContext.tsx` — backend-backed listings, feed, handover tokens, and impact
- `src/components/ngo/NgoOfferCard.tsx` — renders FastAPI match scores, with local scoring only as offline fallback
- `src/components/volunteer/HandoverCodeBox.tsx` — single-use QR token display and 2-hour countdown
- `src/components/ngo/HandoverDesk.tsx` — token verification desk

## Deploy to Vercel

Import the `E:\SurplusLinkAI\frontend` directory as a Vite project and set:

```text
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
VITE_USE_MOCK_DATA=false
```

`vercel.json` adds SPA rewrites and immutable asset caching. CORS on the backend must include the deployed Vercel origin.
