"""End-to-end smoke test for the SurplusLink AI API."""

import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

TEST_DB = Path(__file__).with_name("smoke.db")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB.as_posix()}"
os.environ["CREATE_TABLES_ON_STARTUP"] = "true"
os.environ["JWT_SECRET"] = "test-secret-with-at-least-32-bytes-1234567890"
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_full_rescue_flow() -> None:
    with TestClient(app) as client:
        health = client.get("/health").json()
        assert health["status"] == "healthy"
        assert health["service"] == "SurplusLink AI Backend"

        seeded = client.post("/api/demo/seed")
        assert seeded.status_code == 200, seeded.text

        def login(email: str) -> str:
            response = client.post("/api/auth/login", json={"email": email, "password": "surplus123"})
            assert response.status_code == 200, response.text
            return response.json()["access_token"]

        donor = login("donor@campus.edu")
        ngo = login("ngo@robinhood.org")
        volunteer = login("volunteer@campus.edu")

        # Seeded listings must inherit their donor organisation's coordinates,
        # otherwise every recipient is treated as thousands of km away and the
        # NGO offer feed has an empty eligible shortlist.
        seeded_listings = client.get("/api/donations").json()
        assert seeded_listings
        assert all(
            item["latitude"] is not None and item["longitude"] is not None
            for item in seeded_listings
        )
        seeded_suggestions = client.get(
            "/api/matching/suggest?food_listing_id=1&limit=10", headers=auth(ngo)
        )
        assert seeded_suggestions.status_code == 200, seeded_suggestions.text
        assert seeded_suggestions.json(), "Seeded listing 1 has no eligible recipient"

        extraction = client.post(
            "/api/ai/extract",
            json={"text": "30 kg rice and dal, pickup before 6 PM from MG Road"},
        )
        assert extraction.status_code == 200, extraction.text
        assert extraction.json()["quantity"] == 30
        assert extraction.json()["category"] == "Cooked Meals"

        listing_payload = {
            "title": "Rice and Dal",
            "raw_description": "Fresh cooked meals from the campus canteen",
            "quantity": 30,
            "unit": "meals",
            "available_until": (datetime.now(UTC) + timedelta(hours=6)).isoformat(),
            "pickup_venue": "Campus Canteen Block A",
        }
        listing_response = client.post(
            "/api/donations", json=listing_payload, headers=auth(donor)
        )
        assert listing_response.status_code == 201, listing_response.text
        listing_id = listing_response.json()["id"]

        available = client.get("/api/donations/available")
        assert available.status_code == 200
        assert any(item["id"] == listing_id for item in available.json())

        session_response = client.post(
            "/api/rescue-sessions",
            json={"food_listing_id": listing_id, "host_name": "Canteen Lead"},
            headers=auth(donor),
        )
        assert session_response.status_code == 201, session_response.text
        session = session_response.json()
        session_id = session["id"]
        assert len(session["join_code"]) == 6

        join = client.post(
            "/api/rescue-sessions/join",
            json={"join_code": session["join_code"], "user_name": "NGO Coordinator"},
            headers=auth(ngo),
        )
        assert join.status_code == 200, join.text

        join = client.post(
            "/api/rescue-sessions/join",
            json={"join_code": session["join_code"], "user_name": "Navdeep"},
            headers=auth(volunteer),
        )
        assert join.status_code == 200, join.text

        participants = client.get(f"/api/rescue-sessions/{session_id}/participants")
        assert participants.status_code == 200
        assert len(participants.json()) == 3

        forbidden = client.post(
            f"/api/rescue-sessions/{session_id}/events",
            json={"event_type": "donationAccepted"},
            headers=auth(donor),
        )
        assert forbidden.status_code == 403

        accepted = client.post(
            f"/api/rescue-sessions/{session_id}/events",
            json={"event_type": "donationAccepted"},
            headers=auth(ngo),
        )
        assert accepted.status_code == 200, accepted.text
        assert accepted.json()["status"] == "ngo_accepted"

        assigned = client.post(
            f"/api/rescue-sessions/{session_id}/events",
            json={"event_type": "volunteerAssigned"},
            headers=auth(volunteer),
        )
        assert assigned.status_code == 200, assigned.text

        suggestions = client.get(f"/api/matching/suggest?food_listing_id={listing_id}")
        assert suggestions.status_code == 200, suggestions.text
        assert isinstance(suggestions.json(), list)

        pickups = client.get("/api/pickups")
        assert pickups.status_code == 200, pickups.text
        assert pickups.json()[0]["recipient_name"] == "City Robin Hood Army"
        pickup_id = pickups.json()[0]["pickup_id"]

        qr = client.post(f"/api/pickups/{pickup_id}/qr", headers=auth(volunteer))
        assert qr.status_code == 200, qr.text
        handover_token = qr.json()["token"]

        verify = client.post(
            f"/api/pickups/{pickup_id}/verify",
            json={"token": handover_token},
            headers=auth(ngo),
        )
        assert verify.status_code == 200, verify.text

        duplicate = client.post(
            f"/api/pickups/{pickup_id}/verify",
            json={"token": handover_token},
            headers=auth(ngo),
        )
        assert duplicate.status_code == 400

        impact = client.get("/api/dashboard/impact")
        assert impact.status_code == 200, impact.text
        assert impact.json()["handovers_completed"] >= 1

        verified = client.post(
            f"/api/rescue-sessions/{session_id}/events",
            json={"event_type": "handoverVerified"},
            headers=auth(volunteer),
        )
        assert verified.status_code == 200, verified.text
        assert verified.json()["status"] == "completed"

        updated_listing = client.get(f"/api/donations/{listing_id}")
        assert updated_listing.json()["status"] == "verified"


def test_ported_source_contracts() -> None:
    """The Flask/Dart source contracts remain visible in the FastAPI port."""
    import hashlib
    from typing import get_args

    from app.ai_extraction import _extract_with_local_fallback
    from app.routers.pickups import hash_token
    from app.schemas import PublishEventIn

    original_events = {
        "donationCreated",
        "donationAccepted",
        "volunteerAssigned",
        "pickupStatusChanged",
        "handoverVerified",
    }
    assert original_events.issubset(
        set(get_args(PublishEventIn.model_fields["event_type"].annotation))
    )

    extraction = _extract_with_local_fallback("30 kg rice and dal, pickup before 6 PM")
    assert extraction.quantity == 30
    assert extraction.unit == "kg"
    assert extraction.category == "Cooked Meals"
    assert extraction.deadline == "6 PM"
    assert extraction.pickup_location is None
    assert "pickup_location" in extraction.missing_fields
    assert extraction.requires_confirmation is True
    assert extraction.provider_used == "local_fallback"
    assert "local offline parser" in (extraction.warning or "")

    raw_token = "SL-42-ABCDEF12"
    assert hash_token(raw_token) == hashlib.sha256(
        raw_token.strip().encode("utf-8")
    ).hexdigest()


def test_handover_contract_matches_flask_source() -> None:
    """QR output keeps the attached Flask module's token and single-use rules."""
    import re

    with TestClient(app) as client:
        if not client.get("/api/users").json():
            assert client.post("/api/demo/seed").status_code == 200

        def login(email: str) -> str:
            response = client.post(
                "/api/auth/login", json={"email": email, "password": "surplus123"}
            )
            assert response.status_code == 200, response.text
            return response.json()["access_token"]

        donor = login("donor@campus.edu")
        ngo = login("ngo@robinhood.org")
        volunteer = login("volunteer@campus.edu")

        listing = client.post(
            "/api/donations",
            json={
                "title": "Source parity rice",
                "raw_description": "30 kg rice from campus canteen",
                "category": "Cooked Meals",
                "quantity": 30,
                "unit": "meals",
                "available_until": (datetime.now(UTC) + timedelta(hours=6)).isoformat(),
                "pickup_venue": "Campus Canteen",
            },
            headers=auth(donor),
        )
        assert listing.status_code == 201, listing.text
        listing_id = listing.json()["id"]

        accepted = client.post(
            f"/api/donations/{listing_id}/accept", json={}, headers=auth(ngo)
        )
        assert accepted.status_code == 200, accepted.text

        started = client.post(
            "/api/pickups/start",
            json={"listing_id": listing_id, "volunteer_name": "Parity Rider"},
            headers=auth(volunteer),
        )
        assert started.status_code == 200, started.text
        pickup_id = started.json()["pickup_id"]

        qr = client.post(f"/api/pickups/{pickup_id}/qr", headers=auth(volunteer))
        assert qr.status_code == 200, qr.text
        payload = qr.json()
        assert re.fullmatch(r"SL-\d+-[0-9A-F]{8}", payload["token"])
        assert payload["qr_image"].startswith("data:image/png;base64,")
        expires_at = datetime.fromisoformat(payload["expires_at"])
        lifetime = expires_at - datetime.now(UTC)
        assert timedelta(hours=1, minutes=55) < lifetime <= timedelta(hours=2)

        invalid = client.post(
            f"/api/pickups/{pickup_id}/verify",
            json={"token": "SL-999999-DEADBEEF"},
            headers=auth(ngo),
        )
        assert invalid.status_code == 400
        assert invalid.json()["detail"] == "Invalid handover token."

        verified = client.post(
            f"/api/pickups/{pickup_id}/verify",
            json={"token": payload["token"]},
            headers=auth(ngo),
        )
        assert verified.status_code == 200, verified.text
