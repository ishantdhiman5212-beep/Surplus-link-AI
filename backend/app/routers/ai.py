"""AI extraction endpoint ported from SurplusLink AI version 2."""

import asyncio
import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.ai_extraction import FoodListingExtraction, extract_food_listing

logger = logging.getLogger("surpluslink.extraction_routes")

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/extract", response_model=FoodListingExtraction)
async def extract_listing(request: Request) -> FoodListingExtraction | JSONResponse:
    """Extract structured listing data from donor free text."""
    if "application/json" not in request.headers.get("content-type", "").lower():
        return JSONResponse(
            status_code=400,
            content={
                "error": "Request content-type must be application/json",
                "raw_draft": "",
                "requires_confirmation": True,
            },
        )

    try:
        payload = await request.json()
    except Exception:
        payload = None

    if not isinstance(payload, dict):
        return JSONResponse(
            status_code=400,
            content={
                "error": "Missing or invalid JSON payload in request body",
                "raw_draft": "",
                "requires_confirmation": True,
            },
        )
    if "text" not in payload:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Field 'text' is required in request payload",
                "raw_draft": "",
                "requires_confirmation": True,
            },
        )

    raw_text = payload.get("text")
    if not isinstance(raw_text, str) or not raw_text.strip():
        return JSONResponse(
            status_code=400,
            content={
                "error": "Field 'text' must be a non-empty string",
                "raw_draft": raw_text if isinstance(raw_text, str) else "",
                "requires_confirmation": True,
            },
        )

    try:
        return await asyncio.to_thread(extract_food_listing, raw_text)
    except Exception as exc:
        logger.exception("Unexpected error during food listing extraction: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Extraction pipeline encountered an unexpected error: {exc}",
                "raw_draft": raw_text,
                "requires_confirmation": True,
                "provider_used": "local_fallback",
            },
        )
