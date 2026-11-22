# Source-to-active-stack map

This folder holds **read-only snapshots** of the original projects and the two Flask files that were attached during integration. They are kept here so no original logic is lost. They are **not services**: do not run them and do not extend them. The active application is `backend/` + `frontend/`.

## 1. The Builders Theory — matching and live session events

| Original file | Active replacement | Notes |
| --- | --- | --- |
| `builders-theory/lib/src/services/matching_scorer.dart` | `backend/app/matching.py` | Haversine distance, capacity/distance/operating-hours eligibility, 35 proximity + 25 timing + 25 capacity + 15 category + reliability bonus, explanations and ranking. Deadlines are converted to `MATCHING_TIME_ZONE` before comparing with local NGO hours. |
| `builders-theory/lib/src/endpoints/matching_endpoint.dart` | `backend/app/routers/matching.py`, `backend/app/events.py`, `backend/app/routers/websocket.py` | `suggestRecipients`, `explainMatch`, and `acceptMatch` became `/api/matching/suggest`, `/api/matching/accept`, and WebSocket broadcasts on `rescue_{id}`/global channels. |
| `builders-theory/matching_endpoint.dart`, `builders-theory/matching_scorer.dart`, `builders-theory/services/matching_scorer.dart` | Same as above | Duplicate/root export copies from the original archive, preserved verbatim. |

Verified by `backend/tests/test_matching.py` (timezone + exact scoring weights) and `backend/tests/test_api.py` (API suggestions and event names).

## 2. Surplus_link AIversion2 — AI extraction

| Original file | Active replacement | Notes |
| --- | --- | --- |
| `surpluslink-v2/ai_extraction.py` | `backend/app/ai_extraction.py` | Same Pydantic schema and the same Gemini → OpenAI → Grok/Groq → local-parser fallback chain. `raw_draft` and `requires_confirmation=True` are preserved. |
| `surpluslink-v2/extraction_routes.py` | `backend/app/routers/ai.py` | Same request validation and 400/500 responses for `POST /api/ai/extract`. |
| `surpluslink-v2/app.py` | `backend/app/main.py` | Health/root information now comes from the single FastAPI app. |
| `surpluslink-v2/test_ai_extraction.py` | `backend/tests/test_api.py` | The judge input, offline fallback, missing-field flags, and endpoint validation are covered by FastAPI tests. |
| `surpluslink-v2/requirements.txt`, `.env.example`, `README.md`, `verify_keys.py` | `backend/requirements.txt`, `backend/.env.example`, `backend/README.md` | Configuration and provider keys are documented in the unified backend. The original `.env` was intentionally not copied because it can contain secrets. |

Verified by `test_ported_source_contracts` and the extraction assertions in `test_full_rescue_flow`.

## 3. Attached Flask volunteer QR files — handover and impact

| Original file | Active replacement | Notes |
| --- | --- | --- |
| `flask-volunteer-qr/volunteer_qr.py` | `backend/app/routers/pickups.py`, `backend/app/models.py`, `backend/app/events.py` | `/api/pickups`, PATCH status, QR generation, one-time verification, and impact metrics all exist in FastAPI. Tokens keep the `SL-{pickup_id}-{8 uppercase hex}` format, SHA-256 storage, 2-hour expiry, duplicate rejection, and `Collected` transition. |
| `flask-volunteer-qr/test_volunteer.py` | `backend/tests/test_api.py` | The seeded pickup/verification path is covered end to end with JWT auth and database persistence. |

The React screens that consume this flow are `frontend/src/components/volunteer/HandoverCodeBox.tsx` and `frontend/src/components/ngo/HandoverDesk.tsx`.

Verified by `test_handover_contract_matches_flask_source` and the handover section of `test_full_rescue_flow`.

## 4. React frontend

The frontend was already part of the unified project. Its connection points are:

- `frontend/src/services/api.ts` — calls every FastAPI router with the stored Bearer token.
- `frontend/src/services/adapters.ts` — maps backend rows into the existing React models.
- `frontend/src/context/AuthContext.tsx` — JWT login and preset account mapping.
- `frontend/src/context/RescueContext.tsx` — listings, feed, handover tokens, impact, and WebSocket refresh.
- `frontend/src/components/ngo/NgoOfferCard.tsx` — renders backend match scores, with the local scorer only as an offline fallback.

## Running the checks

From `E:\SurplusLinkAI`:

```powershell
.\verify.ps1
```

This checks that the reference snapshots exist, then runs backend tests, TypeScript, and the Vite production build.
