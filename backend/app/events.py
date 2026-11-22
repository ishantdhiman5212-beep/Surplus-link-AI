"""Helpers for constructing and broadcasting rescue stream events."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import FoodListing, RescueSession
from app.realtime import CHANNEL_GLOBAL, hub, session_channel
from app.schemas import FoodListingOut, RescueSessionOut, StreamEventOut


def utcnow() -> datetime:
    """Return the current UTC time."""
    return datetime.now(UTC)


def listing_out(listing: FoodListing | None) -> FoodListingOut | None:
    """Serialize a listing for a stream event."""
    if listing is None:
        return None
    return FoodListingOut.model_validate(listing)


def session_out(session: RescueSession | None) -> RescueSessionOut | None:
    """Serialize a rescue session for a stream event."""
    if session is None:
        return None
    return RescueSessionOut.model_validate(session)


def build_event(
    *,
    event_type: str,
    rescue_session_id: int,
    food_listing_id: int | None,
    join_code: str | None,
    status: str,
    actor_user_id: int | None,
    actor_role: str | None,
    message: str,
    listing: FoodListing | None,
    session: RescueSession | None,
    timestamp: datetime | None = None,
) -> StreamEventOut:
    """Build a stream event from ORM objects."""
    return StreamEventOut(
        event_type=event_type,
        rescue_session_id=rescue_session_id,
        food_listing_id=food_listing_id,
        join_code=join_code,
        status=status,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        message=message,
        listing=listing_out(listing),
        session=session_out(session),
        timestamp=timestamp or utcnow(),
    )


async def broadcast_event(
    event: StreamEventOut,
    rescue_session_id: int | None = None,
) -> None:
    """Broadcast an event globally and, when present, to a session room."""
    await hub.publish(CHANNEL_GLOBAL, event)
    if rescue_session_id is not None and rescue_session_id > 0:
        await hub.publish(session_channel(rescue_session_id), event)


async def build_session_snapshot(
    db: AsyncSession,
    rescue_session_id: int,
) -> StreamEventOut | None:
    """Build an initial synchronization event for a session WebSocket."""
    session = await db.get(RescueSession, rescue_session_id)
    if session is None:
        return None
    listing = await db.get(FoodListing, session.food_listing_id)
    return build_event(
        event_type="participantJoined",
        rescue_session_id=session.id,
        food_listing_id=session.food_listing_id,
        join_code=session.join_code,
        status=session.status,
        actor_user_id=None,
        actor_role=None,
        message=(
            f"Connected to live session {session.join_code}. "
            f"Status: {session.status}."
        ),
        listing=listing,
        session=session,
    )


async def build_global_snapshot(db: AsyncSession) -> StreamEventOut | None:
    """Build an initial snapshot of the most urgent active listing."""
    result = await db.execute(
        select(FoodListing)
        .where(FoodListing.status == "listed")
        .order_by(FoodListing.available_until.asc())
        .limit(1)
    )
    listing = result.scalar_one_or_none()
    if listing is None:
        return None
    return build_event(
        event_type="donationCreated",
        rescue_session_id=listing.rescue_session_id or 0,
        food_listing_id=listing.id,
        join_code=None,
        status=listing.status,
        actor_user_id=listing.donor_user_id,
        actor_role="donor",
        message=(
            f"Active surplus available: {listing.title} "
            f"({listing.quantity} {listing.unit})"
        ),
        listing=listing,
        session=None,
    )
