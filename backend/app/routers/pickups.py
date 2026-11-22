"""Volunteer pickups, QR handover tokens and impact dashboard."""

import base64
import hashlib
import io
import secrets
from datetime import timedelta

import qrcode
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.auth import CurrentUser, DbSession
from app.events import broadcast_event, build_event, utcnow
from app.models import (
    FoodListing,
    HandoverVerification,
    Organisation,
    PickupAssignment,
    RescueSession,
    SessionParticipant,
    User,
)

router = APIRouter(tags=["pickups"])

DEMO_COORDS = [
    (30.5161, 76.6598),
    (30.4840, 76.5926),
    (30.7333, 76.7794),
]


class PickupStatusUpdate(BaseModel):
    status: str = Field(min_length=1)


class HandoverVerifyIn(BaseModel):
    token: str = Field(min_length=1)


class PickupStartIn(BaseModel):
    listing_id: int
    volunteer_name: str | None = None


CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def _new_join_code() -> str:
    return "".join(secrets.choice(CODE_CHARS) for _ in range(6))


def hash_token(raw_token: str) -> str:
    """Hash a handover token with SHA-256."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()


async def _recipient_organisation(db, session: RescueSession | None) -> Organisation | None:
    """Resolve the accepting NGO user to its organisation record."""
    if session is None or not session.accepted_ngo_id:
        return None
    ngo_user = await db.get(User, session.accepted_ngo_id)
    if ngo_user is None or not ngo_user.organisation_id:
        return None
    return await db.get(Organisation, ngo_user.organisation_id)


async def _pickup_with_context(db, pickup_id: int):
    pickup = await db.get(PickupAssignment, pickup_id)
    if pickup is None:
        raise HTTPException(status_code=404, detail="Pickup not found.")
    listing = await db.get(FoodListing, pickup.food_listing_id)
    session = await db.get(RescueSession, pickup.rescue_session_id)
    return pickup, listing, session, await _recipient_organisation(db, session)


@router.get("/pickups")
async def get_pickups(db: DbSession) -> list[dict]:
    """List volunteer pickups with listing and recipient details."""
    result = await db.execute(select(PickupAssignment).order_by(PickupAssignment.id.desc()))
    output: list[dict] = []
    for pickup in result.scalars().all():
        listing = await db.get(FoodListing, pickup.food_listing_id)
        session = await db.get(RescueSession, pickup.rescue_session_id)
        organisation = await _recipient_organisation(db, session)
        output.append(
            {
                "pickup_id": pickup.id,
                "pickup_status": pickup.pickup_status,
                "scheduled_at": pickup.assigned_at.isoformat(),
                "listing_id": pickup.food_listing_id,
                "title": listing.title if listing else None,
                "quantity": listing.quantity if listing else None,
                "unit": listing.unit if listing else None,
                "pickup_location": listing.pickup_venue if listing else None,
                "deadline": listing.available_until.isoformat() if listing else None,
                "recipient_name": organisation.name if organisation else None,
                "rescue_session_id": pickup.rescue_session_id,
            }
        )
    return output


@router.post("/pickups/start")
async def start_pickup(
    payload: PickupStartIn,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    """Create or reuse a rescue session and assign the caller as volunteer."""
    if user.role.strip().lower() not in {"volunteer", "ngo", "admin"}:
        raise HTTPException(
            status_code=403, detail="Only volunteers, NGOs, or admins can start a pickup."
        )

    listing = await db.get(FoodListing, payload.listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Food listing not found.")

    now = utcnow()
    session = None
    if listing.rescue_session_id:
        session = await db.get(RescueSession, listing.rescue_session_id)
    if session is None:
        for _ in range(100):
            code = _new_join_code()
            exists = await db.scalar(
                select(RescueSession.id).where(RescueSession.join_code == code)
            )
            if exists is None:
                break
        else:
            raise HTTPException(status_code=500, detail="Could not generate a join code.")
        session = RescueSession(
            join_code=code,
            food_listing_id=listing.id,
            host_donor_id=listing.donor_user_id,
            accepted_ngo_id=listing.accepted_ngo_id,
            assigned_volunteer_id=None,
            status="volunteer_assigned",
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

    session.assigned_volunteer_id = user.id
    session.status = "volunteer_assigned"
    session.updated_at = now
    listing.status = "pickup_assigned"

    pickup = await db.scalar(
        select(PickupAssignment).where(
            PickupAssignment.rescue_session_id == session.id,
            PickupAssignment.volunteer_user_id == user.id,
        )
    )
    if pickup is None:
        pickup = PickupAssignment(
            rescue_session_id=session.id,
            food_listing_id=listing.id,
            volunteer_user_id=user.id,
            pickup_status="Pickup in progress",
            pickup_instructions=listing.handling_notes,
            assigned_at=now,
            updated_at=now,
        )
        db.add(pickup)
    else:
        pickup.pickup_status = "Pickup in progress"
        pickup.updated_at = now

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
                user_name=(payload.volunteer_name or user.name).strip() or "Volunteer",
                role=user.role.strip().lower(),
                joined_at=now,
                is_online=True,
            )
        )
    else:
        participant.user_name = (payload.volunteer_name or user.name).strip() or "Volunteer"
        participant.role = user.role.strip().lower()
        participant.is_online = True

    await db.commit()
    await db.refresh(session)
    await db.refresh(pickup)

    return {
        "pickup_id": pickup.id,
        "rescue_session_id": session.id,
        "join_code": session.join_code,
        "listing_id": listing.id,
        "status": pickup.pickup_status,
    }


@router.patch("/pickups/{pickup_id}/status")
async def update_pickup_status(
    pickup_id: int,
    payload: PickupStatusUpdate,
    db: DbSession,
    _user: CurrentUser,
) -> dict:
    """Move a pickup from Accepted to Pickup in progress."""
    allowed = {"Accepted", "Pickup in progress"}
    new_status = payload.status.strip()
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use 'Accepted' or 'Pickup in progress'.",
        )

    pickup, listing, _session, _org = await _pickup_with_context(db, pickup_id)
    if pickup.pickup_status == "Collected":
        raise HTTPException(status_code=400, detail="Completed pickups cannot be modified.")

    pickup.pickup_status = new_status
    pickup.updated_at = utcnow()
    if listing:
        listing.status = "pickup_assigned" if new_status == "Pickup in progress" else "accepted"
    await db.commit()
    return {"pickup_id": pickup_id, "status": new_status}


@router.post("/pickups/{pickup_id}/qr")
async def generate_pickup_qr(
    pickup_id: int,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    """Generate a single-use, two-hour handover token and QR image."""
    pickup, listing, session, _org = await _pickup_with_context(db, pickup_id)
    if pickup.pickup_status == "Collected":
        raise HTTPException(status_code=400, detail="Handover already completed for this pickup.")

    now = utcnow()
    result = await db.execute(
        select(HandoverVerification).where(
            HandoverVerification.rescue_session_id == pickup.rescue_session_id,
            HandoverVerification.food_listing_id == pickup.food_listing_id,
            HandoverVerification.is_used.is_(False),
        )
    )
    for old in result.scalars().all():
        await db.delete(old)

    raw_token = f"SL-{pickup_id}-{secrets.token_hex(4).upper()}"
    expires_at = now + timedelta(hours=2)
    verification = HandoverVerification(
        rescue_session_id=pickup.rescue_session_id,
        food_listing_id=pickup.food_listing_id,
        handover_token=hash_token(raw_token),
        is_used=False,
        generated_by_user_id=user.id,
        verified_by_user_id=None,
        expires_at=expires_at,
        verified_at=None,
    )
    db.add(verification)
    await db.commit()

    image = qrcode.make(raw_token)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "pickup_id": pickup_id,
        "token": raw_token,
        "expires_at": expires_at.isoformat(),
        "qr_image": f"data:image/png;base64,{qr_base64}",
        "listing_title": listing.title if listing else None,
        "rescue_session_id": session.id if session else None,
    }


@router.post("/pickups/{pickup_id}/verify")
async def verify_pickup_handover(
    pickup_id: int,
    payload: HandoverVerifyIn,
    db: DbSession,
    user: CurrentUser,
) -> dict:
    """Verify a handover token once and complete the pickup."""
    submitted_token = payload.token.strip()
    pickup, listing, session, _org = await _pickup_with_context(db, pickup_id)

    result = await db.execute(
        select(HandoverVerification)
        .where(
            HandoverVerification.rescue_session_id == pickup.rescue_session_id,
            HandoverVerification.food_listing_id == pickup.food_listing_id,
        )
        .order_by(HandoverVerification.id.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="No handover QR generated for this pickup.")

    now = utcnow()
    if record.is_used or record.verified_at is not None:
        raise HTTPException(status_code=400, detail="Token already used! Duplicate handover rejected.")
    if record.expires_at < now:
        raise HTTPException(status_code=400, detail="Handover token expired. Generate a new QR code.")
    if hash_token(submitted_token) != record.handover_token:
        raise HTTPException(status_code=400, detail="Invalid handover token.")

    record.is_used = True
    record.verified_by_user_id = user.id
    record.verified_at = now
    pickup.pickup_status = "Collected"
    pickup.updated_at = now
    if listing:
        listing.status = "collected"

    await db.commit()
    await db.refresh(record)
    await db.refresh(pickup)
    if listing:
        await db.refresh(listing)

    if session:
        session.status = "completed"
        session.updated_at = now
        await db.commit()
        await db.refresh(session)
        event = build_event(
            event_type="handoverVerified",
            rescue_session_id=session.id,
            food_listing_id=session.food_listing_id,
            join_code=session.join_code,
            status=session.status,
            actor_user_id=user.id,
            actor_role=user.role.strip().lower(),
            message="Handover verified! Pickup marked as Collected.",
            listing=listing,
            session=session,
            timestamp=now,
        )
        await broadcast_event(event, session.id)

    return {
        "message": "Handover verified! Pickup marked as Collected.",
        "pickup_id": pickup_id,
        "verified_at": now.isoformat(),
    }


@router.get("/dashboard/impact")
async def dashboard_impact(db: DbSession) -> dict:
    """Return impact metrics and map pins for the live dashboard."""
    listings_count = await db.scalar(select(func.count()).select_from(FoodListing))
    pickups_count = await db.scalar(select(func.count()).select_from(PickupAssignment))
    handovers_count = await db.scalar(
        select(func.count())
        .select_from(HandoverVerification)
        .where(HandoverVerification.is_used.is_(True))
    )
    rescued_qty = await db.scalar(
        select(func.coalesce(func.sum(FoodListing.quantity), 0)).where(
            FoodListing.status.in_(["collected", "verified"])
        )
    )
    listing_rows = (await db.execute(select(FoodListing))).scalars().all()

    pins = []
    for index, listing in enumerate(listing_rows):
        lat, lng = DEMO_COORDS[index % len(DEMO_COORDS)]
        if listing.latitude is not None and listing.longitude is not None:
            lat, lng = listing.latitude, listing.longitude
        pins.append(
            {
                "id": listing.id,
                "title": f"{listing.title} ({listing.quantity} {listing.unit})",
                "location": listing.pickup_venue,
                "status": listing.status,
                "lat": lat,
                "lng": lng,
                "is_demo_coord": listing.latitude is None or listing.longitude is None,
            }
        )

    return {
        "listings_created": listings_count or 0,
        "pickups_accepted": pickups_count or 0,
        "handovers_completed": handovers_count or 0,
        "rescued_quantity": round(float(rescued_qty or 0), 1),
        "map_pins": pins,
    }
