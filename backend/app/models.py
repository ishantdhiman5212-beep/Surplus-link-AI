"""SQLAlchemy ORM models for the SurplusLink AI domain."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.timeutils import UTCDateTime

# SQLite only auto-increments INTEGER primary keys. The variant keeps BIGINT on
# PostgreSQL while making local tests and throwaway databases work correctly.
BIGINT = BigInteger().with_variant(Integer, "sqlite")


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)


class User(TimestampMixin, Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    organisation_id: Mapped[int | None] = mapped_column(
        BIGINT, ForeignKey("organisation.id", ondelete="SET NULL"), nullable=True
    )
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)


class Organisation(Base):
    __tablename__ = "organisation"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    max_capacity_meals: Mapped[int] = mapped_column(Integer, nullable=False)
    service_area_km: Mapped[float] = mapped_column(Float, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    operating_hours_start: Mapped[str] = mapped_column(String(16), nullable=False)
    operating_hours_end: Mapped[str] = mapped_column(String(16), nullable=False)
    accepted_categories: Mapped[str] = mapped_column(Text, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class FoodListing(TimestampMixin, Base):
    __tablename__ = "food_listing"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    donor_user_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organisation_id: Mapped[int | None] = mapped_column(
        BIGINT, ForeignKey("organisation.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    raw_description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False, default="General")
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit: Mapped[str] = mapped_column(String(64), nullable=False, default="meals")
    available_until: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, index=True)
    pickup_venue: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    handling_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    missing_fields_flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="listed", index=True)
    accepted_ngo_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    rescue_session_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True, index=True)


class RescueSession(Base):
    __tablename__ = "rescue_session"
    __table_args__ = (Index("join_code_idx", "join_code", unique=True),)

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    join_code: Mapped[str] = mapped_column(String(16), nullable=False)
    food_listing_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("food_listing.id", ondelete="CASCADE"), nullable=False
    )
    host_donor_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    accepted_ngo_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    assigned_volunteer_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)


class SessionParticipant(Base):
    __tablename__ = "session_participant"
    __table_args__ = (
        Index("session_user_idx", "rescue_session_id", "user_id", unique=True),
    )

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    rescue_session_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("rescue_session.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BIGINT, ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class HandoverVerification(Base):
    __tablename__ = "rescue_handover_verification"
    __table_args__ = (Index("handover_token_idx", "handover_token", unique=True),)

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    rescue_session_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    food_listing_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    handover_token: Mapped[str] = mapped_column(String(255), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    generated_by_user_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    verified_by_user_id: Mapped[int | None] = mapped_column(BIGINT, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)


class PickupAssignment(Base):
    __tablename__ = "pickup_assignment"

    id: Mapped[int] = mapped_column(BIGINT, primary_key=True, autoincrement=True)
    rescue_session_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    food_listing_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    volunteer_user_id: Mapped[int] = mapped_column(BIGINT, nullable=False)
    pickup_status: Mapped[str] = mapped_column(String(64), nullable=False)
    pickup_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
