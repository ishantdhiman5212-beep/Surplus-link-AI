"""Focused tests for the matching engine's timezone handling."""

from datetime import UTC, datetime, timedelta

from app.matching import DonationRequirement, NgoCandidate, check_eligibility


def _candidate() -> NgoCandidate:
    return NgoCandidate(
        id=1,
        name="Local NGO",
        capacity=100,
        latitude=30.7333,
        longitude=76.7794,
        service_radius_km=20,
        operating_hours_start="07:00",
        operating_hours_end="23:00",
        accepted_categories=["cooked_meals"],
    )


def _donation(available_until: datetime) -> DonationRequirement:
    return DonationRequirement(
        id=1,
        title="Rice and dal",
        category="cooked_meals",
        quantity=30,
        available_until=available_until,
        latitude=30.7333,
        longitude=76.7794,
    )


def test_operating_hours_compare_in_local_time() -> None:
    """A 06:00 UTC deadline is 11:30 IST and must be inside a 07:00-23:00 window."""
    reference = datetime(2026, 11, 22, 0, 30, tzinfo=UTC)
    result = check_eligibility(
        _candidate(),
        _donation(reference + timedelta(hours=6)),
        reference_time=reference,
    )
    assert result.is_eligible, result.rejection_reason


def test_operating_hours_still_reject_true_outside_window() -> None:
    """A midnight UTC deadline is 05:30 IST and must be rejected."""
    reference = datetime(2026, 11, 22, 18, 0, tzinfo=UTC)
    result = check_eligibility(
        _candidate(),
        _donation(reference + timedelta(hours=6)),
        reference_time=reference,
    )
    assert not result.is_eligible
    assert "local, outside NGO window" in (result.rejection_reason or "")


def test_scoring_weights_match_builders_theory_source() -> None:
    """The Python port preserves the Dart engine's 35/25/25/15 + reliability math."""
    import math

    from app.matching import compute_score

    reference = datetime(2026, 11, 22, 6, 0, tzinfo=UTC)
    donation = _donation(reference + timedelta(hours=4))
    donation.quantity = 50
    candidate = _candidate()
    candidate.service_radius_km = 10.0
    score = compute_score(
        candidate,
        donation,
        reference_time=reference,
        precalculated_distance_km=5.0,
    )

    expected = {
        "proximity_score": 17.5,
        "timing_score": 22.1875,
        "capacity_score": 25.0,
        "category_score": 15.0,
        "reliability_bonus": 5.0,
        "total_score": 84.6875,
    }
    for field, value in expected.items():
        assert math.isclose(getattr(score, field), value, rel_tol=0, abs_tol=1e-9), (
            field,
            getattr(score, field),
            value,
        )
    assert score.distance_km == 5.0
    assert score.time_until_deadline_minutes == 240
