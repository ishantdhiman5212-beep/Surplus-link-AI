"""
SurplusLink AI - Extraction Flask Blueprint
===========================================
Defines the REST API routes for surplus food listing extraction.
Exposes POST /api/ai/extract with strict validation and draft preservation.
"""

import logging
from flask import Blueprint, jsonify, request
from ai_extraction import extract_food_listing, FoodListingExtraction

logger = logging.getLogger("surpluslink.extraction_routes")

# Define Flask Blueprint
extraction_bp = Blueprint("extraction_bp", __name__)
# Aliases for convenience
ai_blueprint = extraction_bp
bp = extraction_bp


@extraction_bp.route("/api/ai/extract", methods=["POST"])
def extract_listing():
    """
    POST /api/ai/extract
    Accepts JSON payload: {"text": "..."}
    Returns HTTP 200 with structured listing extraction, or HTTP 400 on invalid input.
    Always preserves raw_draft.
    """
    if not request.is_json:
        return jsonify({
            "error": "Request content-type must be application/json",
            "raw_draft": "",
            "requires_confirmation": True
        }), 400

    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        return jsonify({
            "error": "Missing or invalid JSON payload in request body",
            "raw_draft": "",
            "requires_confirmation": True
        }), 400

    if "text" not in payload:
        return jsonify({
            "error": "Field 'text' is required in request payload",
            "raw_draft": "",
            "requires_confirmation": True
        }), 400

    raw_text = payload.get("text")
    if not isinstance(raw_text, str) or not raw_text.strip():
        return jsonify({
            "error": "Field 'text' must be a non-empty string",
            "raw_draft": raw_text if isinstance(raw_text, str) else "",
            "requires_confirmation": True
        }), 400

    try:
        extraction_result: FoodListingExtraction = extract_food_listing(raw_text)
        return jsonify(extraction_result.model_dump()), 200
    except Exception as exc:
        logger.error("Unexpected error during food listing extraction: %s", exc, exc_info=True)
        return jsonify({
            "error": f"Extraction pipeline encountered an unexpected error: {str(exc)}",
            "raw_draft": raw_text,
            "requires_confirmation": True,
            "provider_used": "local_fallback"
        }), 500
