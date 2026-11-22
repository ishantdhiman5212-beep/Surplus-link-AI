"""Pure Python port of The Builders Theory matching and ranking engine."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.config import settings
from app.timeutils import ensure_utc


@dataclass
class NgoCandidate:
    id: int
    name: str
    type: str = "ngo"
    capacity: float = 0.0
    latitude: float = 0.0
    longitude: float = 0.0
    service_radius_km: float = 15.0
    operating_hours_start: str | None = None
    operating_hours_end: str | None = None
    accepted_categories: list[str] = field(default_factory=list)
    reliability_rating: float = 5.0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "capacity": self.capacity,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "serviceRadiusKm": self.service_radius_km,
            "operatingHoursStart": self.operating_hours_start,
            "operatingHoursEnd": self.operating_hours_end,
            "acceptedCategories": self.accepted_categories,
            "reliabilityRating": self.reliability_rating,
        }


@dataclass
class DonationRequirement:
    id: int
    title: str
    category: str
    quantity: float
    available_until: datetime
    latitude: float = 0.0
    longitude: float = 0.0
    donor_id: int = 0
    unit: str = "meals"
    handling_notes: str | None = None


@dataclass
class EligibilityResult:
    is_eligible: bool
    distance_km: float
    rejection_reason: str | None = None
    capacity_passed: bool = True
    distance_passed: bool = True
    operating_hours_passed: bool = True


@dataclass
class ScoringBreakdown:
    total_score: float
    proximity_score: float
    timing_score: float
    capacity_score: float
    category_score: float
    reliability_bonus: float
    distance_km: float
    time_until_deadline_minutes: int

    def to_dict(self) -> dict:
        return {
            "totalScore": round(self.total_score, 1),
            "proximityScore": round(self.proximity_score, 1),
            "timingScore": round(self.timing_score, 1),
            "capacityScore": round(self.capacity_score, 1),
            "categoryScore": round(self.category_score, 1),
            "reliabilityBonus": round(self.reliability_bonus, 1),
            "distanceKm": round(self.distance_km, 2),
            "timeUntilDeadlineMinutes": self.time_until_deadline_minutes,
        }


@dataclass
class MatchExplanation:
    headline: str
    tags: list[str]
    key_strengths: list[str]
    operational_note: str | None = None

    def to_dict(self) -> dict:
        return {
            "headline": self.headline,
            "tags": self.tags,
            "keyStrengths": self.key_strengths,
            "operationalNote": self.operational_note,
        }


@dataclass
class ScoredMatch:
    organisation: NgoCandidate
    score: ScoringBreakdown
    explanation: MatchExplanation
    rank: int = 0
    is_eligible: bool = True

    def to_dict(self) -> dict:
        return {
            "organisation": self.organisation.to_dict(),
            "score": self.score.to_dict(),
            "explanation": self.explanation.to_dict(),
            "rank": self.rank,
            "isEligible": self.is_eligible,
        }


EARTH_RADIUS_KM = 6371.0


def _local_time(value: datetime) -> datetime:
    """Convert a stored UTC instant to the timezone used by NGO opening hours."""
    utc_value = ensure_utc(value)
    try:
        return utc_value.astimezone(ZoneInfo(settings.matching_time_zone))
    except (ZoneInfoNotFoundError, ValueError):
        fallback = timezone(timedelta(hours=settings.matching_utc_offset_hours))
        return utc_value.astimezone(fallback)


def calculate_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """Calculate great-circle distance using the Haversine formula."""
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    rad_lat1 = math.radians(lat1)
    rad_lat2 = math.radians(lat2)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.sin(d_lon / 2) ** 2 * math.cos(rad_lat1) * math.cos(rad_lat2)
    )
    c = 2 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    return EARTH_RADIUS_KM * c


def _parse_time_to_minutes(value: str | None) -> int | None:
    if not value:
        return None
    clean = value.strip().lower()
    parts = clean.split(":")
    try:
        if len(parts) >= 2:
            hour = int(parts[0])
            minute = int(parts[1][:2])
            if "pm" in clean and hour < 12:
                hour += 12
            if "am" in clean and hour == 12:
                hour = 0
            return hour * 60 + minute
        single_hour = int(clean)
        return single_hour * 60
    except ValueError:
        return None


def check_eligibility(
    candidate: NgoCandidate,
    donation: DonationRequirement,
    reference_time: datetime | None = None,
) -> EligibilityResult:
    """Apply capacity, service-radius and operating-hours filters."""
    now = ensure_utc(reference_time or datetime.now(UTC))
    available_until = ensure_utc(donation.available_until)
    distance_km = calculate_distance_km(
        donation.latitude,
        donation.longitude,
        candidate.latitude,
        candidate.longitude,
    )

    if candidate.capacity <= 0 or candidate.capacity < donation.quantity:
        return EligibilityResult(
            is_eligible=False,
            distance_km=distance_km,
            capacity_passed=False,
            rejection_reason=(
                f"Insufficient capacity: donation requires {donation.quantity:.0f} "
                f"{donation.unit}, but NGO has {candidate.capacity:.0f} available capacity."
            ),
        )

    max_radius = candidate.service_radius_km if candidate.service_radius_km > 0 else 15.0
    if distance_km > max_radius:
        return EligibilityResult(
            is_eligible=False,
            distance_km=distance_km,
            distance_passed=False,
            rejection_reason=(
                f"Outside service radius: distance is {distance_km:.1f} km "
                f"(max radius is {max_radius:.1f} km)."
            ),
        )

    if available_until < now:
        return EligibilityResult(
            is_eligible=False,
            distance_km=distance_km,
            operating_hours_passed=False,
            rejection_reason="Donation deadline has already passed.",
        )

    start = _parse_time_to_minutes(candidate.operating_hours_start)
    end = _parse_time_to_minutes(candidate.operating_hours_end)
    if start is not None and end is not None:
        local_deadline = _local_time(available_until)
        deadline_minutes = local_deadline.hour * 60 + local_deadline.minute
        if end >= start:
            hours_ok = start <= deadline_minutes <= end
        else:
            hours_ok = deadline_minutes >= start or deadline_minutes <= end
        if not hours_ok:
            return EligibilityResult(
                is_eligible=False,
                distance_km=distance_km,
                operating_hours_passed=False,
                rejection_reason=(
                    f"Operating hours mismatch: donation expires at "
                    f"{local_deadline:%H:%M} local, outside NGO window "
                    f"({candidate.operating_hours_start} - {candidate.operating_hours_end})."
                ),
            )

    return EligibilityResult(is_eligible=True, distance_km=distance_km)


def compute_score(
    candidate: NgoCandidate,
    donation: DonationRequirement,
    reference_time: datetime | None = None,
    precalculated_distance_km: float | None = None,
) -> ScoringBreakdown:
    """Compute the 35/25/25/15 weighted score with reliability bonus."""
    now = ensure_utc(reference_time or datetime.now(UTC))
    available_until = ensure_utc(donation.available_until)
    distance_km = (
        precalculated_distance_km
        if precalculated_distance_km is not None
        else calculate_distance_km(
            donation.latitude,
            donation.longitude,
            candidate.latitude,
            candidate.longitude,
        )
    )
    minutes_left = (available_until - now).total_seconds() / 60
    available_hours = max(0.1, minutes_left / 60)

    max_radius = max(1.0, candidate.service_radius_km)
    proximity_score = 35.0 * max(0.0, 1.0 - min(1.0, distance_km / max_radius))

    transit_hours = (distance_km / 25.0) + 0.25
    if available_hours >= transit_hours:
        buffer_ratio = (available_hours - transit_hours) / available_hours
        timing_score = 25.0 * min(1.0, max(0.2, buffer_ratio))
    else:
        timing_score = 5.0

    capacity_score = 0.0
    if candidate.capacity > 0:
        fill_ratio = donation.quantity / candidate.capacity
        if fill_ratio <= 1.0:
            if 0.5 <= fill_ratio <= 0.95:
                capacity_score = 25.0
            elif fill_ratio < 0.5:
                capacity_score = 15.0 + (10.0 * (fill_ratio / 0.5))
            else:
                capacity_score = 22.0

    requested_category = donation.category.strip().lower()
    normalized_categories = [cat.strip().lower() for cat in candidate.accepted_categories]
    if not normalized_categories:
        category_score = 10.0
    else:
        exact_match = any(
            cat == "all"
            or cat == "general"
            or requested_category in cat
            or cat in requested_category
            for cat in normalized_categories
        )
        category_score = 15.0 if exact_match else 5.0

    reliability_bonus = min(5.0, (candidate.reliability_rating / 5.0) * 5.0)
    total_score = min(
        100.0,
        max(
            0.0,
            proximity_score
            + timing_score
            + capacity_score
            + category_score
            + reliability_bonus,
        ),
    )

    return ScoringBreakdown(
        total_score=total_score,
        proximity_score=proximity_score,
        timing_score=timing_score,
        capacity_score=capacity_score,
        category_score=category_score,
        reliability_bonus=reliability_bonus,
        distance_km=distance_km,
        time_until_deadline_minutes=int(minutes_left),
    )


def generate_explanation(
    candidate: NgoCandidate,
    donation: DonationRequirement,
    score: ScoringBreakdown,
) -> MatchExplanation:
    """Produce human-readable explanation tags for a ranked match."""
    transit_minutes = max(5, round((score.distance_km / 25.0) * 60) + 10)
    tags = [f"📍 {score.distance_km:.1f} km (~{transit_minutes} min away)"]
    strengths: list[str] = []

    if score.distance_km < 3.0:
        strengths.append("High proximity: Fast response time under 15 minutes.")

    requested_category = donation.category.strip().lower()
    category_name = re.sub(r"[_-]", " ", donation.category).title()
    specialized = any(
        cat.strip().lower() == "all" or requested_category in cat.strip().lower()
        for cat in candidate.accepted_categories
    )
    if specialized:
        tags.append(f"🍱 Certified {category_name} Specialist")
        strengths.append(f"Specialized facility equipped for {category_name} handling.")
    else:
        tags.append("🤝 Verified Community Partner")

    fill_pct = round((donation.quantity / candidate.capacity) * 100) if candidate.capacity else 100
    tags.append(f"📦 Capacity Fit ({fill_pct}% utilized)")
    strengths.append(
        f"Sufficient capacity: Accommodates {donation.quantity:.0f} {donation.unit} "
        f"within available quota of {candidate.capacity:.0f}."
    )

    if candidate.operating_hours_end:
        tags.append(f"⏰ Open until {candidate.operating_hours_end}")
    else:
        tags.append("⚡ 24/7 Active Rescue")

    if score.total_score >= 80:
        headline = (
            f"Excellent Match ({score.total_score:.0f}/100) — "
            "Optimal proximity & capacity"
        )
    elif score.total_score >= 60:
        headline = (
            f"Strong Match ({score.total_score:.0f}/100) — "
            "Meets all collection requirements"
        )
    else:
        headline = (
            f"Viable Match ({score.total_score:.0f}/100) — "
            "Eligible for backup pickup"
        )

    operational_note = (
        f"Handling requirement: {donation.handling_notes}"
        if donation.handling_notes
        else "Ready for immediate dispatch upon confirmation."
    )
    return MatchExplanation(
        headline=headline,
        tags=tags,
        key_strengths=strengths,
        operational_note=operational_note,
    )


def rank_recipients(
    candidates: list[NgoCandidate],
    donation: DonationRequirement,
    limit: int | None = None,
    reference_time: datetime | None = None,
) -> list[ScoredMatch]:
    """Filter, score, explain and rank NGO candidates."""
    matches: list[ScoredMatch] = []
    for candidate in candidates:
        eligibility = check_eligibility(candidate, donation, reference_time)
        if not eligibility.is_eligible:
            continue
        score = compute_score(
            candidate,
            donation,
            reference_time,
            eligibility.distance_km,
        )
        matches.append(
            ScoredMatch(
                organisation=candidate,
                score=score,
                explanation=generate_explanation(candidate, donation, score),
            )
        )

    matches.sort(key=lambda item: item.score.total_score, reverse=True)
    ranked = [
        ScoredMatch(
            organisation=item.organisation,
            score=item.score,
            explanation=item.explanation,
            rank=index + 1,
        )
        for index, item in enumerate(matches)
    ]
    return ranked[:limit] if limit and limit > 0 else ranked


def explain_candidate(
    candidate: NgoCandidate,
    donation: DonationRequirement,
    reference_time: datetime | None = None,
) -> ScoredMatch:
    """Score one candidate even when ineligible, preserving the rejection reason."""
    eligibility = check_eligibility(candidate, donation, reference_time)
    score = compute_score(
        candidate,
        donation,
        reference_time,
        eligibility.distance_km,
    )
    explanation = generate_explanation(candidate, donation, score)
    if not eligibility.is_eligible:
        explanation.operational_note = eligibility.rejection_reason
    return ScoredMatch(
        organisation=candidate,
        score=score,
        explanation=explanation,
        rank=1,
        is_eligible=eligibility.is_eligible,
    )
