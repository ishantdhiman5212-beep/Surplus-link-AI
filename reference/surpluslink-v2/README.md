# SurplusLink AI — AI Extraction Engine

Standalone AI Extraction Engine module for the **SurplusLink AI** Flask backend.

Donors enter free-text surplus food descriptions (e.g. `"30 kg rice and dal, pickup before 6 PM"`). This engine automatically extracts structured listing fields, flags missing or uncertain details (such as `pickup_location`), and returns editable structured data with `requires_confirmation: true` for donor verification. Unconfirmed AI output is never auto-saved.

---

## Resilient AI Fallback Architecture

```
[Donor Free-Text Input]
          │
          ▼
┌────────────────────────────────────────┐
│ Tier 1: Primary — Google Gemini        │  (google-genai SDK: gemini-3.1-flash-lite, JSON mode)
│         (Alternate: ChatGPT OpenAI)    │  (openai SDK: gpt-4o-mini, 8s timeout)
└──────────────────┬─────────────────────┘
                   │ (Fails: Missing Key / Timeout / Rate Limit / Quota / Network)
                   ▼
┌────────────────────────────────────────┐
│ Tier 2: Secondary — Grok / Groq Cloud  │  (OpenAI-compatible client: grok-2-latest or qwen/qwen3.8-27b)
└──────────────────┬─────────────────────┘
                   │ (Fails: Missing Key / Timeout / Rate Limit / Network)
                   ▼
┌────────────────────────────────────────┐
│ Tier 3: Tertiary — Local AI Extractor  │  (Pure Python Regex + Lightweight NLP Heuristics)
└────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Output: Structured Listing, Missing Fields Flagged,         │
│         Original raw_draft Preserved, requires_confirm=True │
└─────────────────────────────────────────────────────────────┘
```

1. **Tier 1 (Primary) — Google Gemini (`gemini-3.1-flash-lite`)**: Fast, structured JSON extraction using the official `google-genai` SDK. (Supports OpenAI `gpt-4o-mini` as alternate Tier 1).
2. **Tier 2 (Secondary) — Grok / Groq Cloud**: OpenAI-compatible client (`https://api.x.ai/v1` or `https://api.groq.com/openai/v1`).
3. **Tier 3 (Tertiary) — Local AI Fallback (Offline)**: Python-native heuristic extractor using regex, unit normalization, category taxonomy, and time parsing so the demo never crashes even completely offline.

---

## Output Schema (Pydantic Model)

| Field | Type | Description |
|---|---|---|
| `title` | `str \| None` | Concise name of food items (e.g. `"Rice and dal"`) |
| `category` | `str \| None` | One of `Cooked Meals`, `Grains/Staples`, `Produce`, `Bakery`, `Dairy`, `Other` |
| `quantity` | `float \| None` | Numeric quantity (e.g. `30.0`) |
| `unit` | `str \| None` | Normalized unit (e.g. `kg`, `plates`, `boxes`, `liters`) |
| `deadline` | `str \| None` | Extracted pickup deadline (e.g. `"6 PM"`) |
| `pickup_location` | `str \| None` | Pickup venue or address (`None` if omitted) |
| `missing_fields` | `list[str]` | Flags any required field that is missing or uncertain (e.g. `["pickup_location"]`) |
| `provider_used` | `Literal` | `"gemini"`, `"openai"`, `"grok"`, or `"local_fallback"` |
| `requires_confirmation` | `bool` | Always `True` (donor must confirm before saving) |
| `raw_draft` | `str` | Original donor text input |
| `warning` | `str \| None` | Fallback notification message if cloud tier failed |

---

## API Endpoints

### 1. Extract Food Listing
`POST /api/ai/extract`

**Request:**
```json
{
  "text": "30 kg rice and dal, pickup before 6 PM"
}
```

**Response (HTTP 200 OK):**
```json
{
  "title": "Rice and dal",
  "category": "Cooked Meals",
  "quantity": 30.0,
  "unit": "kg",
  "deadline": "6 PM",
  "pickup_location": null,
  "missing_fields": [
    "pickup_location"
  ],
  "provider_used": "gemini",
  "requires_confirmation": true,
  "raw_draft": "30 kg rice and dal, pickup before 6 PM",
  "warning": null
}
```

### 2. Health Check
`GET /health`
```json
{
  "service": "SurplusLink AI Extraction Engine",
  "status": "healthy"
}
```

---

## Setup & Running

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure keys:
```bash
copy .env.example .env
```

### 3. Verify Key Connectivity
```bash
python verify_keys.py
```

### 4. Run Unit Tests
```bash
pytest -v
```

### 5. Start Flask Server
```bash
python app.py
```
Server runs on `http://127.0.0.1:5000`.
