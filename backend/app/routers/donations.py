"""Donation listing endpoints."""

import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, DbSession
from app.events import broadcast_event, build_event, utcnow
from app.models import FoodListing, Organisation, RescueSession, SessionParticipant
from app.schemas import (
    FoodListingCreate,
    FoodListingOut,
    FoodListingUpdate,
)
from app.timeutils import ensure_utc

router = APIRouter(prefix="/donations", tags=["donations"])

CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

CONTENT_FIELDS = {
    "title",
    "raw_description",
    "quantity",
    "unit",
    "available_until",
    "pickup_venue",
}


def _normalize_role(role: str) -> str:
    return role.strip().lower()


def _event_type_for_status(status_value: str) -> str:
    return {
        "accepted": "donationAccepted",
        "pickup_assigned": "volunteerAssigned",
        "collected": "pickupStatusChanged",
        "in_transit": "pickupStatusChanged",
        "verified": "handoverVerified",
    }.get(status_value.lower(), "pickupStatusChanged")


async def _session_for_listing(db: AsyncSession, rescue_session_id: int | None):
    if not rescue_session_id or rescue_session_id <= 0:
        return None
    return await db.get(RescueSession, rescue_session_id)


@router.post("", response_model=FoodListingOut, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: FoodListingCreate,
    db: DbSession,
    user: CurrentUser,
) -> FoodListingOut:
    """Create a donation listing. Only donors may create listings."""
    role = _normalize_role(user.role)
    if role != "donor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only donors can create listings.",
        )

    now = utcnow()
    available_until = ensure_utc(payload.available_until)
    title = payload.title.strip()
    pickup_venue = payload.pickup_venue.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Food listing title cannot be empty.")
    if not pickup_venue:
        raise HTTPException(status_code=400, detail="pickupVenue cannot be empty.")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0.")
    if available_until < now:
        raise HTTPException(status_code=400, detail="availableUntil must be in the future.")

    organisation = None
    organisation_id = payload.organisation_id or user.organisation_id
    if organisation_id:
        organisation = await db.get(Organisation, organisation_id)

    listing = FoodListing(
        donor_user_id=user.id,
        organisation_id=organisation_id,
        title=title,
        raw_description=(payload.raw_description or "").strip(),
        category=(payload.category or "General").strip() or "General",
        quantity=payload.quantity,
        unit=(payload.unit or "meals").strip() or "meals",
        available_until=available_until,
        pickup_venue=pickup_venue,
        latitude=payload.latitude or (organisation.latitude if organisation else None),
        longitude=payload.longitude or (organisation.longitude if organisation else None),
        handling_notes=payload.handling_notes,
        missing_fields_flagged=payload.missing_fields_flagged,
        status="listed",
        accepted_ngo_id=None,
        rescue_session_id=payload.rescue_session_id,
        created_at=now,
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)

    rescue_session = await _session_for_listing(db, listing.rescue_session_id)
    event = build_event(
        event_type="donationCreated",
        rescue_session_id=listing.rescue_session_id or 0,
        food_listing_id=listing.id,
        join_code=rescue_session.join_code if rescue_session else None,
        status=listing.status,
        actor_user_id=user.id,
        actor_role=role,
        message=(
            f'New surplus food listed: "{listing.title}" '
            f"({listing.quantity} {listing.unit}) at {listing.pickup_venue}"
        ),
        listing=listing,
        session=rescue_session,
        timestamp=now,
    )
    await broadcast_event(event, listing.rescue_session_id)

    return FoodListingOut.model_validate(listing)


@router.patch("/{listing_id}", response_model=FoodListingOut)
async def update_listing(
    listing_id: int,
    payload: FoodListingUpdate,
    db: DbSession,
    user: CurrentUser,
) -> FoodListingOut:
    """Update a listing with donor ownership and role-transition checks."""
    listing = await db.get(FoodListing, listing_id)
    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food listing not found",
        )

    role = _normalize_role(user.role)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return FoodListingOut.model_validate(listing)
    if changes.get("available_until") is not None:
        changes["available_until"] = ensure_utc(changes["available_until"])

    content_modified = any(
        field in changes and changes[field] != getattr(listing, field)
        for field in CONTENT_FIELDS
    )
    if content_modified and (role != "donor" or listing.donor_user_id != user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the original donor can modify listing details.",
        )

    new_status = changes.get("status")
    if new_status is not None:
        normalized_status = new_status.strip().lower()
        if normalized_status != listing.status:
            if normalized_status == "accepted" and role != "ngo":
                raise HTTPException(
                    status_code=403, detail="Only NGOs can accept donation listings."
                )
            if (
                normalized_status in {"pickup_assigned", "collected", "in_transit"}
                and role not in {"volunteer", "ngo"}
            ):
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Only volunteers or recipient NGOs can update pickup status "
                        f"to {normalized_status}."
                    ),
                )
            if normalized_status == "verified" and role not in {
                "donor",
                "ngo",
                "volunteer",
            }:
                raise HTTPException(
                    status_code=403,
                    detail=f"Role {user.role} cannot mark a listing as verified.",
                )
            if normalized_status in {"expired", "cancelled"} and (
                role != "donor" or listing.donor_user_id != user.id
            ):
                raise HTTPException(
                    status_code=403,
                    detail="Only the donor can cancel or expire their listing.",
                )
            changes["status"] = normalized_status

    for field, value in changes.items():
        if field == "status" and new_status is not None:
            value = str(value).strip().lower()
        elif isinstance(value, str):
            value = value.strip()
        setattr(listing, field, value)

    if listing.status == "accepted" and listing.accepted_ngo_id is None and role == "ngo":
        listing.accepted_ngo_id = user.id

    await db.commit()
    await db.refresh(listing)

    rescue_session = await _session_for_listing(db, listing.rescue_session_id)
    event = build_event(
        event_type=_event_type_for_status(listing.status),
        rescue_session_id=listing.rescue_session_id or 0,
        food_listing_id=listing.id,
        join_code=rescue_session.join_code if rescue_session else None,
        status=listing.status,
        actor_user_id=user.id,
        actor_role=role,
        message=f'Donation "{listing.title}" updated to status "{listing.status}".',
        listing=listing,
        session=rescue_session,
    )
    await broadcast_event(event, listing.rescue_session_id)

    return FoodListingOut.model_validate(listing)


@router.get("", response_model=list[FoodListingOut])
async def list_all_listings(
    db: DbSession,
    listing_status: str | None = None,
) -> list[FoodListingOut]:
    """List every donation, optionally filtered by status."""
    query = select(FoodListing)
    if listing_status and listing_status.strip():
        query = query.where(FoodListing.status == listing_status.strip().lower())
    query = query.order_by(FoodListing.created_at.desc())
    result = await db.execute(query)
    return [FoodListingOut.model_validate(row) for row in result.scalars().all()]


@router.post("/{listing_id}/accept")
async def accept_listing(
    listing_id: int,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    """Accept an available listing and open its live rescue session."""
    role = _normalize_role(user.role)
    if role != "ngo":
        raise HTTPException(status_code=403, detail="Only NGOs can accept donation listings.")

    listing = await db.get(FoodListing, listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Food listing not found")
    if listing.status not in {"listed", "open"}:
        raise HTTPException(
            status_code=409,
            detail=f"Listing is no longer available (status: {listing.status}).",
        )

    now = utcnow()
    session = await _session_for_listing(db, listing.rescue_session_id)
    if session is None:
        for _ in range(100):
            code = "".join(secrets.choice(CODE_CHARS) for _ in range(6))
            if await db.scalar(select(RescueSession.id).where(RescueSession.join_code == code)) is None:
                break
        else:
            raise HTTPException(status_code=500, detail="Could not generate a join code.")
        session = RescueSession(
            join_code=code,
            food_listing_id=listing.id,
            host_donor_id=listing.donor_user_id,
            accepted_ngo_id=user.id,
            assigned_volunteer_id=None,
            status="ngo_accepted",
            created_at=now,
            updated_at=now,
        )
        db.add(session)
        await db.flush()
        listing.rescue_session_id = session.id
        db.add(
            SessionParticipant(
                rescue_session_id=session.id,
                user_id=listing.donor_user_id,
                user_name="Host Donor",
                role="donor",
                joined_at=now,
                is_online=True,
            )
        )
    else:
        session.status = "ngo_accepted"
        session.accepted_ngo_id = user.id
        session.updated_at = now

    participant = await db.scalar(
        select(SessionParticipant).where(
            SessionParticipant.rescue_session_id == session.id,
            SessionParticipant.user_id == user.id,
        )
    )
    if participant is None:
        db.add(
            SessionParticipant(
                rescue_session_id=session.id,
                user_id=user.id,
                user_name=user.name,
                role="ngo",
                joined_at=now,
                is_online=True,
            )
        )

    listing.status = "accepted"
    listing.accepted_ngo_id = user.id
    await db.commit()
    await db.refresh(listing)
    await db.refresh(session)

    event = build_event(
        event_type="donationAccepted",
        rescue_session_id=session.id,
        food_listing_id=listing.id,
        join_code=session.join_code,
        status=session.status,
        actor_user_id=user.id,
        actor_role=role,
        message=f'Recipient NGO accepted "{listing.title}".',
        listing=listing,
        session=session,
        timestamp=now,
    )
    await broadcast_event(event, session.id)
    return {
        "message": f'Accepted "{listing.title}".',
        "listing": FoodListingOut.model_validate(listing).model_dump(mode="json"),
        "session": event.session.model_dump(mode="json") if event.session else None,
        "event": event.model_dump(mode="json"),
    }


@router.get("/available", response_model=list[FoodListingOut])
async def list_available_listings(
    db: DbSession,
    category: str | None = None,
    min_quantity: int | None = None,
) -> list[FoodListingOut]:
    """List active surplus listings sorted by deadline urgency."""
    now = utcnow()
    query = select(FoodListing).where(
        FoodListing.status == "listed",
        FoodListing.available_until > now,
    )
    if category and category.strip():
        query = query.where(FoodListing.category == category.strip())
    if min_quantity and min_quantity > 0:
        query = query.where(FoodListing.quantity >= min_quantity)
    query = query.order_by(FoodListing.available_until.asc())

    result = await db.execute(query)
    return [FoodListingOut.model_validate(row) for row in result.scalars().all()]


@router.get("/donor/{donor_user_id}", response_model=list[FoodListingOut])
async def get_listings_by_donor(
    donor_user_id: int,
    db: DbSession,
) -> list[FoodListingOut]:
    """List all listings created by a donor, newest first."""
    result = await db.execute(
        select(FoodListing)
        .where(FoodListing.donor_user_id == donor_user_id)
        .order_by(FoodListing.created_at.desc())
    )
    return [FoodListingOut.model_validate(row) for row in result.scalars().all()]


@router.get("/{listing_id}", response_model=FoodListingOut)
async def get_listing(listing_id: int, db: DbSession) -> FoodListingOut:
    """Fetch a single listing by id."""
    listing = await db.get(FoodListing, listing_id)
    if listing is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Food listing not found",
        )
    return FoodListingOut.model_validate(listing)
