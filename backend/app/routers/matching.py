"""NGO matching endpoints ported from The Builders Theory."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.auth import CurrentUser, DbSession
from app.events import broadcast_event, build_event, utcnow
from app.matching import (
    DonationRequirement,
    NgoCandidate,
    explain_candidate,
    rank_recipients,
)
from app.models import FoodListing, Organisation, RescueSession

router = APIRouter(prefix="/matching", tags=["matching"])

RECIPIENT_TYPES = {"ngo", "shelter", "community_kitchen", "food_bank", "recipient"}


class AcceptMatchIn(BaseModel):
    rescue_session_id: int
    food_listing_id: int
    organisation_id: int
    accepted_by_user_name: str | None = None


def _normalize_category(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def _accepted_categories(value: str) -> list[str]:
    return [_normalize_category(item) for item in value.split(",") if item.strip()]


def _ngo_candidate(organisation: Organisation) -> NgoCandidate:
    return NgoCandidate(
        id=organisation.id,
        name=organisation.name,
        type=organisation.type,
        capacity=float(organisation.max_capacity_meals),
        latitude=organisation.latitude,
        longitude=organisation.longitude,
        service_radius_km=organisation.service_area_km,
        operating_hours_start=organisation.operating_hours_start,
        operating_hours_end=organisation.operating_hours_end,
        accepted_categories=_accepted_categories(organisation.accepted_categories),
        reliability_rating=5.0,
    )


async def _listing_coordinates(listing: FoodListing, db) -> tuple[float, float]:
    """Use the donor organisation's location for listings without stored coordinates."""
    if listing.latitude is not None and listing.longitude is not None:
        return float(listing.latitude), float(listing.longitude)
    if listing.organisation_id is not None:
        organisation = await db.get(Organisation, listing.organisation_id)
        if (
            organisation is not None
            and organisation.latitude is not None
            and organisation.longitude is not None
        ):
            return float(organisation.latitude), float(organisation.longitude)
    return 0.0, 0.0


def _donation_requirement(
    listing: FoodListing,
    latitude: float = 0.0,
    longitude: float = 0.0,
) -> DonationRequirement:
    return DonationRequirement(
        id=listing.id,
        title=listing.title,
        category=_normalize_category(listing.category),
        quantity=float(listing.quantity),
        available_until=listing.available_until,
        latitude=latitude,
        longitude=longitude,
        donor_id=listing.donor_user_id,
        unit=listing.unit,
        handling_notes=listing.handling_notes,
    )


@router.get("/suggest")
async def suggest_recipients(
    food_listing_id: int,
    db: DbSession,
    limit: int = 5,
) -> list[dict]:
    """Return eligible NGOs ranked by proximity, timing, capacity and category."""
    listing = await db.get(FoodListing, food_listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Food listing not found.")

    result = await db.execute(select(Organisation).where(Organisation.type.in_(RECIPIENT_TYPES)))
    candidates = [_ngo_candidate(org) for org in result.scalars().all()]
    latitude, longitude = await _listing_coordinates(listing, db)
    matches = rank_recipients(
        candidates,
        _donation_requirement(listing, latitude, longitude),
        limit=limit,
        reference_time=utcnow(),
    )
    return [match.to_dict() for match in matches]


@router.get("/explain")
async def explain_match(
    food_listing_id: int,
    organisation_id: int,
    db: DbSession,
) -> dict:
    """Explain the score and eligibility of one NGO for one listing."""
    listing = await db.get(FoodListing, food_listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Food listing not found.")
    organisation = await db.get(Organisation, organisation_id)
    if organisation is None:
        raise HTTPException(status_code=404, detail="Organisation not found.")

    latitude, longitude = await _listing_coordinates(listing, db)
    match = explain_candidate(
        _ngo_candidate(organisation),
        _donation_requirement(listing, latitude, longitude),
        reference_time=utcnow(),
    )
    return match.to_dict()


@router.post("/accept")
async def accept_match(
    payload: AcceptMatchIn,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    """Accept a matched NGO and broadcast the donationAccepted event."""
    role = user.role.strip().lower()
    if role not in {"ngo", "admin"}:
        raise HTTPException(status_code=403, detail="Only NGOs or platform admins can accept a match.")

    session = await db.get(RescueSession, payload.rescue_session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Rescue session not found.")
    listing = await db.get(FoodListing, payload.food_listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Food listing not found.")
    organisation = await db.get(Organisation, payload.organisation_id)
    if organisation is None:
        raise HTTPException(status_code=404, detail="Organisation not found.")
    if session.food_listing_id != listing.id:
        raise HTTPException(
            status_code=400, detail="Rescue session and listing do not match."
        )

    now = utcnow()
    session.status = "ngo_accepted"
    session.accepted_ngo_id = user.id
    session.updated_at = now
    listing.status = "accepted"
    listing.accepted_ngo_id = user.id
    await db.commit()
    await db.refresh(session)
    await db.refresh(listing)

    event = build_event(
        event_type="donationAccepted",
        rescue_session_id=session.id,
        food_listing_id=listing.id,
        join_code=session.join_code,
        status=session.status,
        actor_user_id=user.id,
        actor_role=role,
        message=(
            f"Recipient NGO {organisation.name} accepted rescue for "
            f'"{listing.title}".'
        ),
        listing=listing,
        session=session,
        timestamp=now,
    )
    await broadcast_event(event, session.id)
    return {
        "message": f"Match accepted by {organisation.name}.",
        "event": event.model_dump(mode="json"),
    }
