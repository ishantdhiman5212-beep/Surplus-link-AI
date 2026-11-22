"""Live rescue session endpoints."""

import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth import CurrentUser, DbSession
from app.events import broadcast_event, build_event, utcnow
from app.models import (
    FoodListing,
    PickupAssignment,
    RescueSession,
    SessionParticipant,
)
from app.schemas import (
    FoodListingOut,
    ParticipantOut,
    PublishEventIn,
    RescueSessionCreate,
    RescueSessionJoin,
    RescueSessionOut,
    StreamEventOut,
)

router = APIRouter(prefix="/rescue-sessions", tags=["rescue-sessions"])

CODE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

ROLE_REQUIREMENTS: dict[str, set[str]] = {
    "donationCreated": {"donor"},
    "donationAccepted": {"ngo"},
    "volunteerAssigned": {"volunteer", "ngo"},
    "pickupStatusChanged": {"volunteer", "ngo"},
    "handoverVerified": {"donor", "ngo", "volunteer"},
    "participantJoined": {"donor", "ngo", "volunteer"},
}


def generate_join_code() -> str:
    """Generate a six-character code without ambiguous characters."""
    return "".join(secrets.choice(CODE_CHARS) for _ in range(6))


async def generate_unique_join_code(db) -> str:
    """Generate a join code that is not already stored."""
    for _ in range(100):
        code = generate_join_code()
        existing = await db.scalar(
            select(RescueSession.id).where(RescueSession.join_code == code)
        )
        if existing is None:
            return code
    raise HTTPException(
        status_code=500,
        detail="Unable to generate a unique join code after multiple attempts.",
    )


def default_event_message(
    event_type: str,
    role: str,
    session: RescueSession,
    listing: FoodListing | None,
) -> str:
    """Build the fallback message for a session event."""
    title = listing.title if listing else "Food donation"
    messages = {
        "donationCreated": f"Donation created: {title} (Join Code: {session.join_code})",
        "donationAccepted": f'Recipient NGO accepted rescue for "{title}".',
        "volunteerAssigned": f'Volunteer assigned to pick up "{title}".',
        "pickupStatusChanged": (
            f'Pickup status changed to "{session.status}" for "{title}".'
        ),
        "handoverVerified": f'Handover successfully verified for "{title}"! Rescue complete.',
    }
    return messages.get(event_type, f'Session status updated to "{session.status}".')


@router.post("", response_model=RescueSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: RescueSessionCreate,
    db: DbSession,
    user: CurrentUser,
) -> RescueSessionOut:
    """Launch a live rescue session for a listing owned by the donor."""
    role = user.role.strip().lower()
    if role != "donor":
        raise HTTPException(
            status_code=403, detail="Only donors can launch a rescue session."
        )

    listing = await db.get(FoodListing, payload.food_listing_id)
    if listing is None:
        raise HTTPException(
            status_code=404,
            detail=f"Food listing {payload.food_listing_id} not found.",
        )
    if listing.donor_user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the listing donor can launch a rescue session.",
        )

    now = utcnow()
    session = RescueSession(
        join_code=await generate_unique_join_code(db),
        food_listing_id=listing.id,
        host_donor_id=user.id,
        accepted_ngo_id=None,
        assigned_volunteer_id=None,
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(session)
    await db.flush()

    listing.rescue_session_id = session.id
    db.add(
        SessionParticipant(
            rescue_session_id=session.id,
            user_id=user.id,
            user_name=(payload.host_name or user.name).strip() or "Host Donor",
            role="donor",
            joined_at=now,
            is_online=True,
        )
    )
    await db.commit()
    await db.refresh(session)
    await db.refresh(listing)

    event = build_event(
        event_type="donationCreated",
        rescue_session_id=session.id,
        food_listing_id=listing.id,
        join_code=session.join_code,
        status=session.status,
        actor_user_id=user.id,
        actor_role="donor",
        message=(
            f'Live rescue session started for "{listing.title}" '
            f"with Join Code {session.join_code}"
        ),
        listing=listing,
        session=session,
        timestamp=now,
    )
    await broadcast_event(event, session.id)

    return RescueSessionOut.model_validate(session)


@router.post("/join", response_model=RescueSessionOut)
async def join_with_code(
    payload: RescueSessionJoin,
    db: DbSession,
    user: CurrentUser,
) -> RescueSessionOut:
    """Join a session with its six-character code."""
    code = payload.join_code.strip().upper()
    role = user.role.strip().lower()
    if role not in ROLE_REQUIREMENTS["participantJoined"]:
        raise HTTPException(status_code=400, detail=f'Invalid role "{user.role}".')

    session = await db.scalar(
        select(RescueSession).where(RescueSession.join_code == code)
    )
    if session is None:
        raise HTTPException(
            status_code=404, detail=f'No rescue session found with join code "{code}".'
        )
    if session.status in {"completed", "cancelled"}:
        raise HTTPException(
            status_code=409,
            detail=f'Rescue session "{code}" is closed (status: {session.status}).',
        )

    now = utcnow()
    participant = await db.scalar(
        select(SessionParticipant).where(
            SessionParticipant.rescue_session_id == session.id,
            SessionParticipant.user_id == user.id,
        )
    )
    display_name = (payload.user_name or user.name).strip() or f"User {user.id}"
    if participant is None:
        db.add(
            SessionParticipant(
                rescue_session_id=session.id,
                user_id=user.id,
                user_name=display_name,
                role=role,
                joined_at=now,
                is_online=True,
            )
        )
    else:
        participant.user_name = display_name
        participant.role = role
        participant.is_online = True

    await db.commit()
    await db.refresh(session)

    listing = await db.get(FoodListing, session.food_listing_id)
    event = build_event(
        event_type="participantJoined",
        rescue_session_id=session.id,
        food_listing_id=session.food_listing_id,
        join_code=session.join_code,
        status=session.status,
        actor_user_id=user.id,
        actor_role=role,
        message=f"{display_name} ({role}) joined the rescue room.",
        listing=listing,
        session=session,
        timestamp=now,
    )
    await broadcast_event(event, session.id)

    return RescueSessionOut.model_validate(session)


@router.get("/by-code/{join_code}", response_model=RescueSessionOut)
async def get_session_by_code(join_code: str, db: DbSession) -> RescueSessionOut:
    """Fetch a rescue session by join code."""
    code = join_code.strip().upper()
    session = await db.scalar(
        select(RescueSession).where(RescueSession.join_code == code)
    )
    if session is None:
        raise HTTPException(
            status_code=404, detail=f'No rescue session found with join code "{code}".'
        )
    return RescueSessionOut.model_validate(session)


@router.get("/{session_id}", response_model=RescueSessionOut)
async def get_session(session_id: int, db: DbSession) -> RescueSessionOut:
    """Fetch a rescue session by id."""
    session = await db.get(RescueSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=404, detail="Rescue session not found."
        )
    return RescueSessionOut.model_validate(session)


@router.get("/{session_id}/participants", response_model=list[ParticipantOut])
async def get_session_participants(
    session_id: int,
    db: DbSession,
) -> list[ParticipantOut]:
    """List connected participants for a session."""
    result = await db.execute(
        select(SessionParticipant)
        .where(SessionParticipant.rescue_session_id == session_id)
        .order_by(SessionParticipant.joined_at.asc())
    )
    return [
        ParticipantOut.model_validate(row) for row in result.scalars().all()
    ]


@router.get("/{session_id}/listing", response_model=FoodListingOut)
async def get_session_listing(session_id: int, db: DbSession) -> FoodListingOut:
    """Fetch the listing linked to a rescue session."""
    session = await db.get(RescueSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Rescue session not found.")
    listing = await db.get(FoodListing, session.food_listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Linked listing not found.")
    return FoodListingOut.model_validate(listing)


@router.post("/{session_id}/events", response_model=StreamEventOut)
async def publish_session_event(
    session_id: int,
    payload: PublishEventIn,
    db: DbSession,
    user: CurrentUser,
) -> StreamEventOut:
    """Publish a role-checked session event and apply its state transition."""
    event_type = payload.event_type
    role = user.role.strip().lower()

    if role not in ROLE_REQUIREMENTS.get(event_type, set()):
        raise HTTPException(
            status_code=403,
            detail=f"Role {user.role} cannot emit {event_type}.",
        )

    session = await db.get(RescueSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=404, detail=f"RescueSession not found with ID {session_id}."
        )
    listing = await db.get(FoodListing, session.food_listing_id)

    now = utcnow()
    session.updated_at = now
    requested_status = payload.new_status.strip().lower() if payload.new_status else None

    if event_type == "donationAccepted":
        session.status = requested_status or "ngo_accepted"
        session.accepted_ngo_id = user.id
        if listing:
            listing.status = "accepted"
            listing.accepted_ngo_id = user.id
    elif event_type == "volunteerAssigned":
        session.status = requested_status or "volunteer_assigned"
        session.assigned_volunteer_id = user.id
        if listing:
            listing.status = "pickup_assigned"
            pickup = await db.scalar(
                select(PickupAssignment).where(
                    PickupAssignment.rescue_session_id == session.id,
                    PickupAssignment.volunteer_user_id == user.id,
                )
            )
            if pickup is None:
                db.add(
                    PickupAssignment(
                        rescue_session_id=session.id,
                        food_listing_id=listing.id,
                        volunteer_user_id=user.id,
                        pickup_status="Accepted",
                        pickup_instructions=payload.message or listing.handling_notes,
                        assigned_at=now,
                        updated_at=now,
                    )
                )
            else:
                pickup.pickup_status = "Accepted"
                pickup.updated_at = now
    elif event_type == "pickupStatusChanged":
        session.status = requested_status or "in_transit"
        if listing:
            listing.status = "collected" if requested_status == "collected" else "pickup_assigned"
    elif event_type == "handoverVerified":
        session.status = "completed"
        if listing:
            listing.status = "verified"
    elif requested_status:
        session.status = requested_status

    await db.commit()
    await db.refresh(session)
    if listing:
        await db.refresh(listing)

    event = build_event(
        event_type=event_type,
        rescue_session_id=session.id,
        food_listing_id=session.food_listing_id,
        join_code=session.join_code,
        status=session.status,
        actor_user_id=user.id,
        actor_role=role,
        message=payload.message or default_event_message(event_type, role, session, listing),
        listing=listing,
        session=session,
        timestamp=now,
    )
    await broadcast_event(event, session.id)
    return event
