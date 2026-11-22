"""
SurplusLink AI - AI Extraction Engine Test Suite
================================================
Comprehensive pytest unit tests covering:
  1. Judge demo input ("30 kg rice and dal, pickup before 6 PM") -> quantity 30, unit kg,
     category Cooked Meals, deadline 6 PM, missing_fields containing pickup_location.
  2. Fallback Tier 1 -> Tier 2: Mock OpenAI failure and verify Grok is invoked.
  3. Fallback Tier 2 -> Tier 3: Mock both OpenAI and Grok failure, verify local fallback
     succeeds, provider_used="local_fallback", and warning is set.
  4. Draft preservation and confirmation: requires_confirmation is strictly True and raw_draft is preserved.
  5. Flask API endpoint validation: Reject empty text, whitespace, or missing text with HTTP 400.
  6. Flask API endpoint success: Return HTTP 200 with structured JSON response.
"""

import json
from unittest.mock import MagicMock, patch
import pytest
from app import create_app
from ai_extraction import (
    FoodListingExtraction,
    _extract_with_local_fallback,
    extract_food_listing,
)


@pytest.fixture
def app():
    """Create Flask application fixture for testing."""
    test_app = create_app()
    test_app.config["TESTING"] = True
    return test_app


@pytest.fixture
def client(app):
    """Create Flask test client fixture."""
    return app.test_client()


# ==============================================================================
# 1. Judge Demo Input Tests
# ==============================================================================

def test_judge_demo_input_offline_extractor():
    """
    Judge demo input: '30 kg rice and dal, pickup before 6 PM'
    Verify extraction extracts:
      - quantity = 30
      - unit = kg
      - category = Cooked Meals
      - deadline = 6 PM
      - missing_fields includes pickup_location
      - requires_confirmation is True
      - raw_draft is preserved
    """
    demo_text = "30 kg rice and dal, pickup before 6 PM"
    result: FoodListingExtraction = _extract_with_local_fallback(demo_text)

    assert result.quantity == 30.0 or result.quantity == 30
    assert result.unit == "kg"
    assert result.category == "Cooked Meals"
    assert result.deadline == "6 PM"
    assert result.pickup_location is None
    assert "pickup_location" in result.missing_fields
    assert result.requires_confirmation is True
    assert result.raw_draft == demo_text
    assert result.provider_used == "local_fallback"
    assert result.warning is not None
    assert "local offline parser" in result.warning


def test_judge_demo_input_end_to_end_local_fallback():
    """
    Ensure extract_food_listing without API keys gracefully executes
    Tier 3 local fallback and extracts all fields correctly.
    """
    demo_text = "30 kg rice and dal, pickup before 6 PM"
    # Ensure env keys are empty to test clean fallback
    with patch.dict("os.environ", {"OPENAI_API_KEY": "", "XAI_API_KEY": "", "GEMINI_API_KEY": "", "GOOGLE_API_KEY": ""}, clear=False):
        result = extract_food_listing(demo_text)

        assert result.quantity == 30
        assert result.unit == "kg"
        assert result.category == "Cooked Meals"
        assert result.deadline == "6 PM"
        assert "pickup_location" in result.missing_fields
        assert result.provider_used == "local_fallback"
        assert result.requires_confirmation is True
        assert result.raw_draft == demo_text


# ==============================================================================
# 2. 3-Tier Fallback Architecture Tests
# ==============================================================================

def test_tier1_gemini_success():
    """
    Verify that when Google Gemini succeeds, provider_used='gemini' and warning is None.
    """
    demo_text = "30 kg rice and dal, pickup before 6 PM"
    mock_gemini_json = {
        "title": "Rice and dal",
        "category": "Cooked Meals",
        "quantity": 30.0,
        "unit": "kg",
        "deadline": "6 PM",
        "pickup_location": None,
        "missing_fields": ["pickup_location"]
    }

    with patch.dict("os.environ", {"GEMINI_API_KEY": "test-gemini-key"}, clear=False):
        with patch("ai_extraction._extract_with_gemini") as mock_gemini:
            mock_gemini.return_value = FoodListingExtraction(
                title="Rice and dal",
                category="Cooked Meals",
                quantity=30.0,
                unit="kg",
                deadline="6 PM",
                pickup_location=None,
                missing_fields=["pickup_location"],
                provider_used="gemini",
                requires_confirmation=True,
                raw_draft=demo_text,
                warning=None
            )

            result = extract_food_listing(demo_text)

            assert result.provider_used == "gemini"
            assert result.quantity == 30
            assert result.unit == "kg"
            assert result.deadline == "6 PM"
            assert "pickup_location" in result.missing_fields
            assert result.warning is None
            assert result.requires_confirmation is True
            assert result.raw_draft == demo_text


def test_tier1_openai_success():
    """
    Verify that when OpenAI succeeds, provider_used='openai' and warning is None.
    """
    demo_text = "30 kg rice and dal, pickup before 6 PM"
    mock_llm_json = {
        "title": "Rice and dal",
        "category": "Cooked Meals",
        "quantity": 30.0,
        "unit": "kg",
        "deadline": "6 PM",
        "pickup_location": None,
        "missing_fields": ["pickup_location"]
    }

    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content=json.dumps(mock_llm_json)))
    ]

    with patch.dict("os.environ", {"OPENAI_API_KEY": "sk-test-key", "GEMINI_API_KEY": "", "GOOGLE_API_KEY": ""}, clear=False):
        with patch("ai_extraction.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_openai_cls.return_value = mock_client
            mock_client.chat.completions.create.return_value = mock_response

            result = extract_food_listing(demo_text)

            assert result.provider_used == "openai"
            assert result.quantity == 30
            assert result.unit == "kg"
            assert result.deadline == "6 PM"
            assert "pickup_location" in result.missing_fields
            assert result.warning is None
            assert result.requires_confirmation is True
            assert result.raw_draft == demo_text


def test_fallback_tier1_to_tier2_grok_called():
    """
    Fallback Tier 1 -> Tier 2:
    Mock Tier 1 failure (Gemini & OpenAI timeout / rate limit / API error)
    Verify Grok is called and succeeds with provider_used='grok'.
    """
    demo_text = "30 kg rice and dal, pickup before 6 PM"

    with patch("ai_extraction._extract_with_gemini", side_effect=RuntimeError("Gemini error")):
        with patch("ai_extraction._extract_with_openai", side_effect=RuntimeError("OpenAI 8s timeout exceeded")):
            with patch("ai_extraction._extract_with_grok") as mock_grok:
                mock_grok.return_value = FoodListingExtraction(
                    title="Rice and dal",
                    category="Cooked Meals",
                    quantity=30.0,
                    unit="kg",
                    deadline="6 PM",
                    pickup_location=None,
                    missing_fields=["pickup_location"],
                    provider_used="grok",
                    requires_confirmation=True,
                    raw_draft=demo_text,
                    warning="Primary provider unavailable. Extracted using Grok (xAI fallback)."
                )

                result = extract_food_listing(demo_text)

                # Assert Grok was invoked as Tier 2 fallback
                mock_grok.assert_called_once_with(demo_text)
                assert result.provider_used == "grok"
                assert result.warning is not None
                assert "Grok" in result.warning
                assert result.quantity == 30
                assert result.unit == "kg"
                assert result.deadline == "6 PM"
                assert "pickup_location" in result.missing_fields
                assert result.requires_confirmation is True
                assert result.raw_draft == demo_text


def test_fallback_tier2_to_tier3_local_fallback():
    """
    Fallback Tier 2 -> Tier 3:
    Mock both Tier 1 and Grok failures.
    Verify local fallback succeeds and sets provider_used='local_fallback'.
    """
    demo_text = "30 kg rice and dal, pickup before 6 PM"

    with patch("ai_extraction._extract_with_gemini", side_effect=RuntimeError("Gemini unavailable")):
        with patch("ai_extraction._extract_with_openai", side_effect=RuntimeError("OpenAI connection failed")):
            with patch("ai_extraction._extract_with_grok", side_effect=RuntimeError("Grok rate limit reached")):
                result = extract_food_listing(demo_text)

                assert result.provider_used == "local_fallback"
                assert result.warning is not None
                assert "local offline parser" in result.warning
                assert result.quantity == 30
                assert result.unit == "kg"
                assert result.deadline == "6 PM"
                assert "pickup_location" in result.missing_fields
                assert result.requires_confirmation is True
                assert result.raw_draft == demo_text
            assert result.quantity == 30
            assert result.unit == "kg"
            assert result.deadline == "6 PM"
            assert "pickup_location" in result.missing_fields
            assert result.requires_confirmation is True
            assert result.raw_draft == demo_text


# ==============================================================================
# 3. Draft Preservation & Confirmation Tests
# ==============================================================================

def test_draft_preservation_and_requires_confirmation_always_true():
    """
    Verify raw_draft strictly matches original text and requires_confirmation
    is ALWAYS True across any parsing path.
    """
    test_inputs = [
        "30 kg rice and dal, pickup before 6 PM",
        "15 boxes of fresh sourdough bread, pickup at 45 Market St by 4 PM",
        "surplus cooked food available",
    ]

    for user_text in test_inputs:
        result = extract_food_listing(user_text)
        assert result.raw_draft == user_text
        assert result.requires_confirmation is True


def test_missing_fields_flagged_when_details_absent():
    """
    Verify that when quantity, unit, deadline, and pickup_location are omitted,
    they are all flagged in missing_fields.
    """
    vague_text = "surplus food available"
    result = extract_food_listing(vague_text)

    assert "pickup_location" in result.missing_fields
    assert "quantity" in result.missing_fields
    assert "unit" in result.missing_fields
    assert "deadline" in result.missing_fields
    assert result.requires_confirmation is True


def test_location_extracted_when_present():
    """
    Verify that when pickup location is given, it is extracted and not in missing_fields.
    """
    text_with_loc = "50 plates of vegetable biryani, pickup by 8 PM at St. Mary Hall"
    result = _extract_with_local_fallback(text_with_loc)

    assert result.quantity == 50.0
    assert result.unit == "plates"
    assert result.category == "Cooked Meals"
    assert result.deadline == "8 PM"
    assert result.pickup_location == "St. Mary Hall"
    assert "pickup_location" not in result.missing_fields


# ==============================================================================
# 4. Flask API Endpoint Tests (POST /api/ai/extract)
# ==============================================================================

def test_api_extract_success(client):
    """
    Test POST /api/ai/extract with valid input returns HTTP 200 and structured JSON.
    """
    response = client.post(
        "/api/ai/extract",
        json={"text": "30 kg rice and dal, pickup before 6 PM"},
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()

    assert data["quantity"] == 30.0
    assert data["unit"] == "kg"
    assert data["category"] in ["Cooked Meals", "Grains/Staples"]
    assert data["deadline"] == "6 PM"
    assert "pickup_location" in data["missing_fields"]
    assert data["requires_confirmation"] is True
    assert data["raw_draft"] == "30 kg rice and dal, pickup before 6 PM"
    assert data["provider_used"] in ["openai", "gemini", "grok", "local_fallback"]


def test_api_extract_rejects_empty_text(client):
    """
    Verify POST /api/ai/extract rejects empty string text with HTTP 400.
    """
    response = client.post(
        "/api/ai/extract",
        json={"text": ""},
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["raw_draft"] == ""
    assert data["requires_confirmation"] is True


def test_api_extract_rejects_whitespace_text(client):
    """
    Verify POST /api/ai/extract rejects whitespace-only text with HTTP 400.
    """
    response = client.post(
        "/api/ai/extract",
        json={"text": "   \n\t  "},
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["requires_confirmation"] is True


def test_api_extract_rejects_missing_text_key(client):
    """
    Verify POST /api/ai/extract rejects payloads missing the 'text' key with HTTP 400.
    """
    response = client.post(
        "/api/ai/extract",
        json={"other_key": "some value"},
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
    assert data["requires_confirmation"] is True


def test_api_extract_rejects_non_json_payload(client):
    """
    Verify POST /api/ai/extract rejects non-JSON payload with HTTP 400.
    """
    response = client.post(
        "/api/ai/extract",
        data="raw string not json",
        content_type="text/plain"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_health_check_endpoint(client):
    """
    Verify GET /health returns 200 OK.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
