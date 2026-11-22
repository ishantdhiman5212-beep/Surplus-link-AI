"""Pydantic request and response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.timeutils import ensure_utc

Role = Literal["donor", "ngo", "volunteer", "admin"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_validator("*", mode="before")
    @classmethod
    def _normalize_datetimes(cls, value):
        return ensure_utc(value) if isinstance(value, datetime) else value


class DatetimeInputModel(BaseModel):
    """Base model that interprets naive incoming datetimes as UTC."""

    @field_validator("*", mode="before")
    @classmethod
    def _normalize_datetimes(cls, value):
        return ensure_utc(value) if isinstance(value, datetime) else value


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = None
    role: Role
    organisation_id: int | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None
    role: str
    organisation_id: int | None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageOut(BaseModel):
    message: str


class OrganisationCreate(BaseModel):
    name: str = Field(min_length=1)
    type: str
    max_capacity_meals: int = Field(ge=0)
    service_area_km: float = Field(ge=0)
    latitude: float
    longitude: float
    address: str
    operating_hours_start: str
    operating_hours_end: str
    accepted_categories: str
    is_verified: bool = False


class OrganisationOut(OrganisationCreate, ORMModel):
    id: int


class FoodListingCreate(DatetimeInputModel):
    title: str = Field(min_length=1, max_length=500)
    raw_description: str = ""
    category: str | None = None
    quantity: int = Field(gt=0)
    unit: str | None = None
    available_until: datetime
    pickup_venue: str = Field(min_length=1)
    latitude: float | None = None
    longitude: float | None = None
    handling_notes: str | None = None
    missing_fields_flagged: bool = False
    organisation_id: int | None = None
    rescue_session_id: int | None = None


class FoodListingUpdate(DatetimeInputModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    raw_description: str | None = None
    category: str | None = None
    quantity: int | None = Field(default=None, gt=0)
    unit: str | None = None
    available_until: datetime | None = None
    pickup_venue: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    handling_notes: str | None = None
    missing_fields_flagged: bool | None = None
    status: str | None = None
    accepted_ngo_id: int | None = None


class FoodListingOut(ORMModel):
    id: int
    donor_user_id: int
    organisation_id: int | None
    title: str
    raw_description: str
    category: str
    quantity: int
    unit: str
    available_until: datetime
    pickup_venue: str
    latitude: float | None
    longitude: float | None
    handling_notes: str | None
    missing_fields_flagged: bool
    status: str
    accepted_ngo_id: int | None
    rescue_session_id: int | None
    created_at: datetime


class RescueSessionCreate(BaseModel):
    food_listing_id: int
    host_name: str | None = None


class RescueSessionJoin(BaseModel):
    join_code: str = Field(min_length=6, max_length=6)
    user_name: str | None = None


class RescueSessionOut(ORMModel):
    id: int
    join_code: str
    food_listing_id: int
    host_donor_id: int
    accepted_ngo_id: int | None
    assigned_volunteer_id: int | None
    status: str
    created_at: datetime
    updated_at: datetime


class ParticipantOut(ORMModel):
    id: int
    rescue_session_id: int
    user_id: int
    user_name: str
    role: str
    joined_at: datetime
    is_online: bool


class StreamEventOut(BaseModel):
    event_type: str
    rescue_session_id: int
    food_listing_id: int | None = None
    join_code: str | None = None
    status: str
    actor_user_id: int | None = None
    actor_role: str | None = None
    message: str
    listing: FoodListingOut | None = None
    session: RescueSessionOut | None = None
    timestamp: datetime


class PublishEventIn(BaseModel):
    event_type: Literal[
        "donationCreated",
        "donationAccepted",
        "volunteerAssigned",
        "pickupStatusChanged",
        "handoverVerified",
        "participantJoined",
    ]
    new_status: str | None = None
    message: str | None = None
