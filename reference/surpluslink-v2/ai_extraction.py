"""
SurplusLink AI - AI Extraction Engine
======================================
Standalone module for extracting structured surplus food donation listings
from unstructured free-text descriptions.

3-Tier Resilient AI Fallback Architecture (Strict Order):
  1. Primary: ChatGPT (OpenAI API - gpt-4o-mini with structured JSON & 8s timeout)
  2. Secondary: Grok (xAI API - grok-2-latest via OpenAI-compatible client & 8s timeout)
  3. Tertiary: Local AI Fallback (Pure Python Regex + lightweight NLP keyword heuristic parsing)

Never auto-saves unconfirmed AI output. Always preserves raw_draft and sets requires_confirmation=True.
"""

import json
import logging
import os
import re
from typing import List, Literal, Optional
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field

# Load environment variables from .env file
load_dotenv()

# Logger configuration
logger = logging.getLogger("surpluslink.ai_extraction")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [SurplusLink-AI] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Default Model Configurations & Timeouts
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
DEFAULT_XAI_MODEL = os.getenv("XAI_MODEL", "grok-2-latest")
AI_TIMEOUT_SECONDS = float(os.getenv("AI_TIMEOUT_SECONDS", "8.0"))

# Required fields that should be flagged if missing or uncertain
ESSENTIAL_FIELDS = ["title", "category", "quantity", "unit", "deadline", "pickup_location"]

# System prompt for cloud LLMs (OpenAI & Grok)
EXTRACTION_SYSTEM_PROMPT = """You are the AI Food Listing Extraction Engine for SurplusLink AI, a surplus food rescue platform.
Your task is to extract structured listing information from a donor's free-text food description.

Return ONLY a valid JSON object with the following schema:
{
  "title": "<Concise food item name, e.g., 'Rice and dal', or null>",
  "category": "<One of: 'Cooked Meals', 'Grains/Staples', 'Produce', 'Bakery', 'Dairy', 'Other', or null>",
  "quantity": <Numeric amount as float or int, or null>,
  "unit": "<Unit of measurement, e.g., 'kg', 'plates', 'boxes', 'liters', or null>",
  "deadline": "<Pickup deadline, e.g., '6 PM', or null>",
  "pickup_location": "<Pickup address, venue name, or null>",
  "missing_fields": ["<list of any required fields that are missing, null, or uncertain from: 'title', 'category', 'quantity', 'unit', 'deadline', 'pickup_location'>"]
}

Strict Rules:
1. Never hallucinate or assume unstated details. If not mentioned in the donor's text, set the field to null.
2. If pickup location is not explicitly stated in the donor's text, 'pickup_location' must be null and 'pickup_location' MUST be included in 'missing_fields'.
3. Always verify whether 'title', 'category', 'quantity', 'unit', 'deadline', or 'pickup_location' is missing; include any missing or ambiguous fields in 'missing_fields'.
4. Categorization: Cooked/prepared foods (e.g., 'rice and dal', 'biryani', 'curry') should be classified as 'Cooked Meals'. Raw/dry rations (e.g. 'raw rice', 'flour') should be classified as 'Grains/Staples'.
5. Do not wrap the JSON output in markdown codeblocks. Return pure JSON.
"""

# Pydantic Models
class ExtractionRequest(BaseModel):
    """Schema for incoming extraction request payload."""
    text: str = Field(..., min_length=1, description="Raw donor text describing surplus food")


class FoodListingExtraction(BaseModel):
    """Schema for structured food listing extraction output."""
    title: Optional[str] = None
    category: Optional[str] = None  # Cooked Meals, Grains/Staples, Produce, Bakery, Dairy, Other
    quantity: Optional[float] = None
    unit: Optional[str] = None  # kg, plates, boxes, liters, etc.
    deadline: Optional[str] = None  # extracted pickup deadline
    pickup_location: Optional[str] = None
    missing_fields: List[str] = Field(default_factory=list)
    provider_used: Literal["openai", "gemini", "grok", "local_fallback"]
    requires_confirmation: bool = True  # Always True - never auto-save unconfirmed AI output
    raw_draft: str  # Always preserve the original donor text
    warning: Optional[str] = None


# Local Offline Parsing Heuristics & Knowledge Base
CATEGORY_KEYWORDS = {
    "Cooked Meals": [
        "rice and dal", "dal and rice", "dal", "curry", "biryani", "khichdi",
        "roti", "rotis", "chapati", "chapatis", "naan", "paratha", "parathas",
        "cooked rice", "cooked meal", "cooked meals", "cooked food", "cooked",
        "meal", "meals", "soup", "pasta", "pizza", "burger", "burgers",
        "sandwich", "sandwiches", "noodles", "fried rice", "gravy", "sabzi",
        "paneer butter masala", "buffet", "catering", "leftover", "leftovers",
        "dinner", "lunch", "breakfast", "mess food"
    ],
    "Grains/Staples": [
        "raw rice", "uncooked rice", "rice grain", "wheat", "flour", "atta", "maida",
        "grains", "grain", "pulses", "lentils", "cereal", "oats", "dry beans",
        "dry ration", "dry rations", "staples", "staple"
    ],
    "Produce": [
        "apple", "apples", "banana", "bananas", "orange", "oranges", "tomato", "tomatoes",
        "potato", "potatoes", "onion", "onions", "carrot", "carrots", "spinach",
        "vegetable", "vegetables", "veggies", "fruit", "fruits", "salad", "greens",
        "cabbage", "cauliflower", "cucumbers", "cucumber"
    ],
    "Bakery": [
        "bread", "breads", "loaf", "loaves", "bun", "buns", "pastry", "pastries",
        "croissant", "croissants", "cake", "cakes", "muffin", "muffins",
        "bagel", "bagels", "donut", "donuts", "cookies", "biscuit", "biscuits",
        "toast"
    ],
    "Dairy": [
        "milk", "cheese", "butter", "yogurt", "curd", "paneer", "cream", "ghee"
    ],
}

UNIT_NORMALIZATION = {
    "kg": "kg", "kgs": "kg", "kilogram": "kg", "kilograms": "kg", "kilo": "kg", "kilos": "kg",
    "g": "g", "gm": "g", "gms": "g", "gram": "g", "grams": "g",
    "plate": "plates", "plates": "plates", "portion": "plates", "portions": "plates",
    "serving": "plates", "servings": "plates", "meal": "plates", "meals": "plates",
    "box": "boxes", "boxes": "boxes",
    "packet": "packets", "packets": "packets", "pack": "packets", "packs": "packets",
    "liter": "liters", "liters": "liters", "litre": "liters", "litres": "liters", "l": "liters",
    "ml": "ml",
    "tray": "trays", "trays": "trays",
    "bag": "bags", "bags": "bags",
    "piece": "pieces", "pieces": "pieces", "pcs": "pieces",
    "lb": "lbs", "lbs": "lbs", "pound": "lbs", "pounds": "lbs",
}


def _extract_quantity_unit_local(text: str) -> tuple[Optional[float], Optional[str]]:
    """Extract numeric quantity and unit of measure using regex heuristics."""
    units_regex = (
        r'\b(kg|kgs|kilograms?|kilos?|g|gm|gms|grams?|plates?|portions?|servings?|'
        r'meals?|boxes|box|packets?|packs?|liters?|litres?|l|ml|trays?|bags?|pieces?|pcs|lbs?|pounds?)\b'
    )
    # Match number + unit: e.g. "30 kg", "30kg", "2.5 liters"
    pattern = rf'(\d+(?:\.\d+)?)\s*{units_regex}'
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        qty = float(match.group(1))
        unit_raw = match.group(2).lower()
        unit = UNIT_NORMALIZATION.get(unit_raw, unit_raw)
        return qty, unit

    # Match number only
    num_match = re.search(r'\b(\d+(?:\.\d+)?)\b', text)
    if num_match:
        qty = float(num_match.group(1))
        return qty, None

    return None, None


def _extract_deadline_local(text: str) -> Optional[str]:
    """Extract pickup deadline using time and preposition regex patterns."""
    # 1. Matches with AM/PM: e.g. "pickup before 6 PM", "before 6:00 PM", "by 6 PM", "6pm"
    pattern_time = r'\b(?:pickup\s+)?(?:before|by|until|before\s+pickup\s+at|at)?\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\b'
    match = re.search(pattern_time, text, re.IGNORECASE)
    if match:
        time_str = match.group(1).strip()
        # Normalize spacing and uppercase: e.g. "6pm" -> "6 PM"
        time_str = re.sub(r'(?i)(\d+)\s*(am|pm)', r'\1 \2', time_str).upper()
        return time_str

    # 2. Matches 24-hr time: e.g. "before 18:00"
    pattern_24 = r'\b(?:pickup\s+)?(?:before|by|until|at)\s*(\d{1,2}:\d{2})\b'
    match = re.search(pattern_24, text, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    # 3. Matches named times: "before noon", "by midnight"
    pattern_named = r'\b(?:pickup\s+)?(?:before|by|until|at)\s*(noon|midnight)\b'
    match = re.search(pattern_named, text, re.IGNORECASE)
    if match:
        return match.group(1).strip().capitalize()

    return None


def _extract_location_local(text: str) -> Optional[str]:
    """Extract pickup address/venue using common location keywords."""
    loc_keywords = (
        r'(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|'
        r'Sector|Block|Floor|Building|Hall|Center|Centre|Cafeteria|Restaurant|'
        r'Hostel|Mess|Campus|Hotel|Park|Square|Place)'
    )
    # 1. Keyword 'at'/'from' followed by address with street/venue keyword
    pattern1 = rf'\b(?:pickup\s+)?(?:at|from)\s+([A-Z0-9][A-Za-z0-9\s,\.-]+?\b{loc_keywords}\b[^\n,]*)'
    match = re.search(pattern1, text, re.IGNORECASE)
    if match:
        return match.group(1).strip().rstrip(".,")

    # 2. Labeled location: "pickup location: Tech Park"
    pattern2 = r'\b(?:pickup\s+location|location|address)\s*[:=-]\s*([^\n,]+)'
    match = re.search(pattern2, text, re.IGNORECASE)
    if match:
        return match.group(1).strip().rstrip(".,")

    # 3. Street number address: "at 123 Main Street"
    pattern3 = r'\b(?:at|from)\s+([0-9]+\s+[A-Za-z0-9\s,\.-]+)'
    match = re.search(pattern3, text, re.IGNORECASE)
    if match:
        return match.group(1).strip().rstrip(".,")

    return None


def _extract_category_local(text: str) -> Optional[str]:
    """Classify food category based on keyword knowledge base."""
    lower_text = text.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            pattern = rf'\b{re.escape(kw)}\b'
            if re.search(pattern, lower_text):
                return category
    return "Other"


def _extract_title_local(text: str, category: Optional[str]) -> Optional[str]:
    """Derive clean food title by removing parsed quantity, deadline, and location phrases."""
    cleaned = text

    # Remove location phrase
    loc_keywords = (
        r'(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd|'
        r'Sector|Block|Floor|Building|Hall|Center|Centre|Cafeteria|Restaurant|'
        r'Hostel|Mess|Campus|Hotel|Park|Square|Place)'
    )
    cleaned = re.sub(rf'\b(?:pickup\s+)?(?:at|from)\s+[A-Z0-9][A-Za-z0-9\s,\.-]+?\b{loc_keywords}\b[^\n,]*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(?:pickup\s+location|location|address)\s*[:=-]\s*[^\n,]+', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(?:at|from)\s+[0-9]+\s+[A-Za-z0-9\s,\.-]+', '', cleaned, flags=re.IGNORECASE)

    # Remove deadline phrases
    cleaned = re.sub(r'\b(?:pickup\s+)?(?:before|by|until|at)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|noon|midnight)\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(?:pickup\s+)?(?:before|by|until|at)\s*\d{1,2}:\d{2}\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bpickup\s+before\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bpickup\s+by\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bpickup\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b(?:today|tomorrow|tonight)\b', '', cleaned, flags=re.IGNORECASE)

    # Remove quantity + unit
    units_regex = (
        r'(?:kg|kgs|kilograms?|kilos?|g|gm|gms|grams?|plates?|portions?|servings?|'
        r'meals?|boxes|box|packets?|packs?|liters?|litres?|l|ml|trays?|bags?|pieces?|pcs|lbs?|pounds?)'
    )
    cleaned = re.sub(rf'\b\d+(?:\.\d+)?\s*{units_regex}\b', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\b\d+(?:\.\d+)?\b', '', cleaned)

    # Remove leading/trailing/orphan filler words like "of", "fresh", "available", commas
    cleaned = re.sub(r'\bof\b', ' ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bfresh\b', ' ', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = re.sub(r'^[,\s\.-]+|[,\s\.-]+$', '', cleaned).strip()
    cleaned = re.sub(r'^(?:available|surplus)\s+', '', cleaned, flags=re.IGNORECASE).strip()
    cleaned = re.sub(r'^[,\s\.-]+|[,\s\.-]+$', '', cleaned).strip()

    if cleaned:
        return cleaned[:1].upper() + cleaned[1:]

    if category and category != "Other":
        return f"Surplus {category}"

    return None


def _normalize_and_validate_extraction(
    raw_data: dict,
    raw_draft: str,
    provider_used: Literal["openai", "grok", "local_fallback"],
    warning: Optional[str] = None
) -> FoodListingExtraction:
    """Normalize extracted fields and ensure all missing/uncertain essential fields are flagged."""
    title = raw_data.get("title")
    category = raw_data.get("category")
    quantity = raw_data.get("quantity")
    if quantity is not None:
        try:
            quantity = float(quantity)
        except (ValueError, TypeError):
            quantity = None

    unit = raw_data.get("unit")
    deadline = raw_data.get("deadline")
    pickup_location = raw_data.get("pickup_location")

    # Start with provided missing_fields or create empty list
    missing_fields_input = raw_data.get("missing_fields") or []
    if not isinstance(missing_fields_input, list):
        missing_fields_input = []

    missing_fields: List[str] = [str(f) for f in missing_fields_input]

    # Verify all essential fields; if any is None, empty, or whitespace, flag it
    checks = {
        "title": title,
        "category": category,
        "quantity": quantity,
        "unit": unit,
        "deadline": deadline,
        "pickup_location": pickup_location,
    }
    for field_name, val in checks.items():
        if val is None or (isinstance(val, str) and not val.strip()):
            if field_name not in missing_fields:
                missing_fields.append(field_name)

    return FoodListingExtraction(
        title=title.strip() if isinstance(title, str) and title.strip() else None,
        category=category.strip() if isinstance(category, str) and category.strip() else None,
        quantity=quantity,
        unit=unit.strip().lower() if isinstance(unit, str) and unit.strip() else None,
        deadline=deadline.strip() if isinstance(deadline, str) and deadline.strip() else None,
        pickup_location=pickup_location.strip() if isinstance(pickup_location, str) and pickup_location.strip() else None,
        missing_fields=missing_fields,
        provider_used=provider_used,
        requires_confirmation=True,
        raw_draft=raw_draft,
        warning=warning,
    )


def _extract_with_gemini(text: str) -> FoodListingExtraction:
    """Tier 1 Primary: Extract listing using Google Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key or not api_key.strip():
        raise ValueError("GEMINI_API_KEY environment variable is missing or empty")

    from google import genai
    client = genai.Client(api_key=api_key.strip())
    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    prompt = (
        f"{EXTRACTION_SYSTEM_PROMPT}\n\n"
        f"Extract surplus food details from this donor text:\n\"{text}\""
    )

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config={"response_mime_type": "application/json"}
    )

    content = response.text
    if not content:
        raise ValueError("Empty response received from Gemini API")

    data = json.loads(content)
    if isinstance(data, list) and len(data) > 0:
        data = data[0]
    elif not isinstance(data, dict):
        raise ValueError("Gemini response is not a valid JSON object")

    return _normalize_and_validate_extraction(
        raw_data=data,
        raw_draft=text,
        provider_used="gemini",
        warning=None
    )


def _extract_with_openai(text: str) -> FoodListingExtraction:
    """Tier 1: Extract listing using ChatGPT via OpenAI official SDK."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or not api_key.strip():
        raise ValueError("OPENAI_API_KEY environment variable is missing or empty")

    client = OpenAI(api_key=api_key, timeout=AI_TIMEOUT_SECONDS)
    response = client.chat.completions.create(
        model=DEFAULT_OPENAI_MODEL,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Extract surplus food details from this donor text:\n\n\"{text}\""}
        ],
        response_format={"type": "json_object"},
        temperature=0.0,
        timeout=AI_TIMEOUT_SECONDS,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response received from OpenAI API")

    data = json.loads(content)
    return _normalize_and_validate_extraction(
        raw_data=data,
        raw_draft=text,
        provider_used="openai",
        warning=None
    )


def _extract_with_grok(text: str) -> FoodListingExtraction:
    """Tier 2: Extract listing using Grok / Groq via OpenAI-compatible API."""
    api_key = os.getenv("XAI_API_KEY")
    if not api_key or not api_key.strip():
        raise ValueError("XAI_API_KEY environment variable is missing or empty")

    api_key = api_key.strip()
    # Seamlessly support both xAI Grok (xai-...) and Groq Cloud (gsk_...)
    if api_key.startswith("gsk_"):
        base_url = "https://api.groq.com/openai/v1"
        model = os.getenv("XAI_MODEL", "qwen/qwen3.8-27b")
        if model in ["grok-2-latest", "grok-beta"]:
            model = "qwen/qwen3.8-27b"
        provider_label = "Groq"
    else:
        base_url = "https://api.x.ai/v1"
        model = os.getenv("XAI_MODEL", "grok-2-latest")
        provider_label = "Grok"

    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=AI_TIMEOUT_SECONDS
    )
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Extract surplus food details from this donor text:\n\n\"{text}\""}
        ],
        response_format={"type": "json_object"},
        temperature=0.0,
        timeout=AI_TIMEOUT_SECONDS,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError(f"Empty response received from {provider_label} API")

    data = json.loads(content)
    return _normalize_and_validate_extraction(
        raw_data=data,
        raw_draft=text,
        provider_used="grok",
        warning=f"Primary provider (OpenAI) unavailable. Extracted using {provider_label} (xAI fallback)."
    )


def _extract_with_local_fallback(text: str) -> FoodListingExtraction:
    """Tier 3: Extract listing using local offline heuristic rule-based parser."""
    qty, unit = _extract_quantity_unit_local(text)
    deadline = _extract_deadline_local(text)
    pickup_loc = _extract_location_local(text)
    category = _extract_category_local(text)
    title = _extract_title_local(text, category)

    raw_data = {
        "title": title,
        "category": category,
        "quantity": qty,
        "unit": unit,
        "deadline": deadline,
        "pickup_location": pickup_loc,
        "missing_fields": []
    }

    return _normalize_and_validate_extraction(
        raw_data=raw_data,
        raw_draft=text,
        provider_used="local_fallback",
        warning="Cloud AI services unavailable. Extracted using local offline parser; please verify all fields."
    )


def extract_food_listing(text: str) -> FoodListingExtraction:
    """
    Extract structured food listing data following a 3-tier fallback architecture:
      Tier 1: ChatGPT (OpenAI API)
      Tier 2: Grok (xAI API)
      Tier 3: Local Offline Extractor (Python heuristics)

    Parameters:
      text: Unstructured free-text description entered by food donor.

    Returns:
      FoodListingExtraction Pydantic model with structured fields, provider_used,
      missing_fields flags, raw_draft preservation, and requires_confirmation=True.
    """
    if not text or not isinstance(text, str) or not text.strip():
        raise ValueError("Input text must be a non-empty string")

    donor_text = text.strip()

    # Tier 1: Primary - Google Gemini (preferred) or OpenAI ChatGPT
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        try:
            logger.info("Initiating Tier 1 extraction with Google Gemini (model: %s)...", DEFAULT_GEMINI_MODEL)
            result = _extract_with_gemini(donor_text)
            logger.info("Tier 1 extraction succeeded with Google Gemini.")
            return result
        except Exception as exc:
            logger.warning(
                "Tier 1 Gemini extraction failed (%s: %s). Checking fallback providers...",
                type(exc).__name__,
                exc
            )

    # Alternate Tier 1: OpenAI
    try:
        logger.info("Initiating Tier 1 extraction with OpenAI (model: %s)...", DEFAULT_OPENAI_MODEL)
        result = _extract_with_openai(donor_text)
        logger.info("Tier 1 extraction succeeded with OpenAI.")
        return result
    except Exception as exc:
        logger.warning(
            "Tier 1 OpenAI extraction failed (%s: %s). Falling back to Tier 2 (Grok)...",
            type(exc).__name__,
            exc
        )

    # Tier 2: Secondary - Grok (xAI)
    try:
        logger.info("Initiating Tier 2 extraction with Grok (model: %s)...", DEFAULT_XAI_MODEL)
        result = _extract_with_grok(donor_text)
        logger.info("Tier 2 extraction succeeded with Grok.")
        return result
    except Exception as exc:
        logger.warning(
            "Tier 2 Grok extraction failed (%s: %s). Falling back to Tier 3 (Local Fallback)...",
            type(exc).__name__,
            exc
        )

    # Tier 3: Tertiary - Local Offline Fallback
    logger.info("Running Tier 3 local offline extraction fallback...")
    result = _extract_with_local_fallback(donor_text)
    logger.info("Tier 3 local offline extraction succeeded.")
    return result
