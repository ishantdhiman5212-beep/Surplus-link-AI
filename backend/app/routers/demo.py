"""Demo data seeding endpoint."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.auth import DbSession, hash_password
from app.events import utcnow
from app.models import FoodListing, Organisation, User
from app.schemas import MessageOut

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_PASSWORD = "surplus123"

PRESET_ORGS = [
    {
        "key": "spice_route",
        "name": "Spice Route Restaurant",
        "type": "donor",
        "max_capacity_meals": 0,
        "service_area_km": 5.0,
        "latitude": 30.5100,
        "longitude": 76.5900,
        "address": "MG Road, Metro Pillar 42",
        "operating_hours_start": "08:00",
        "operating_hours_end": "23:00",
        "accepted_categories": "All",
        "is_verified": True,
    },
    {
        "key": "roti",
        "name": "Roti Bank Foundation",
        "type": "ngo",
        "max_capacity_meals": 120,
        "service_area_km": 10.0,
        "latitude": 30.5161,
        "longitude": 76.6598,
        "address": "Central Distribution Hub, Sector 14",
        "operating_hours_start": "08:00",
        "operating_hours_end": "22:00",
        "accepted_categories": "Cooked Meals, Bakery, Produce, Packaged",
        "is_verified": True,
    },
    {
        "key": "sewa",
        "name": "Sewa Community Kitchen",
        "type": "community_kitchen",
        "max_capacity_meals": 90,
        "service_area_km": 12.0,
        "latitude": 30.4840,
        "longitude": 76.5926,
        "address": "Community Center, MG Road",
        "operating_hours_start": "09:00",
        "operating_hours_end": "23:00",
        "accepted_categories": "Cooked Meals, Bakery, Produce",
        "is_verified": True,
    },
    {
        "key": "anna",
        "name": "Annapurna Shelter Home",
        "type": "shelter",
        "max_capacity_meals": 50,
        "service_area_km": 15.0,
        "latitude": 30.7333,
        "longitude": 76.7794,
        "address": "North Shelter Complex, Gate 3",
        "operating_hours_start": "07:00",
        "operating_hours_end": "23:00",
        "accepted_categories": "Cooked Meals, Packaged",
        "is_verified": True,
    },
    {
        "key": "campus",
        "name": "Main Auditorium Catering",
        "type": "donor",
        "max_capacity_meals": 500,
        "service_area_km": 10.0,
        "latitude": 30.7360,
        "longitude": 76.7800,
        "address": "Main Auditorium, Campus Gate 1",
        "operating_hours_start": "08:00",
        "operating_hours_end": "22:00",
        "accepted_categories": "All, Cooked Meals, Buffet Surplus",
        "is_verified": True,
    },
    {
        "key": "robinhood",
        "name": "City Robin Hood Army",
        "type": "ngo",
        "max_capacity_meals": 250,
        "service_area_km": 15.0,
        "latitude": 30.7333,
        "longitude": 76.7794,
        "address": "Sector 17 Community Center, Chandigarh",
        "operating_hours_start": "07:00",
        "operating_hours_end": "23:00",
        "accepted_categories": "Cooked Meals, Snacks, Bakery",
        "is_verified": True,
    },
]

PRESET_USERS = [
    {
        "email": "donor@campus.edu",
        "name": "Main Auditorium Catering",
        "role": "donor",
        "org_key": "campus",
    },
    {
        "email": "ngo@robinhood.org",
        "name": "Robin Hood Coordinator",
        "role": "ngo",
        "org_key": "robinhood",
    },
    {
        "email": "volunteer@campus.edu",
        "name": "Navdeep Volunteer",
        "role": "volunteer",
        "org_key": None,
    },
    {
        "email": "chef@spiceroute.com",
        "name": "Spice Route Restaurant",
        "role": "donor",
        "org_key": "spice_route",
    },
    {
        "email": "roti@rotibank.org",
        "name": "Roti Bank Dispatch Lead",
        "role": "ngo",
        "org_key": "roti",
    },
    {
        "email": "sewa@kitchen.org",
        "name": "Sewa Kitchen Coordinator",
        "role": "ngo",
        "org_key": "sewa",
    },
    {
        "email": "anna@shelter.org",
        "name": "Annapurna Shelter Lead",
        "role": "ngo",
        "org_key": "anna",
    },
    {
        "email": "rider.arjun@surpluslink.org",
        "name": "Arjun Verma",
        "role": "volunteer",
        "org_key": None,
    },
    {
        "email": "priya.rider@surpluslink.org",
        "name": "Priya Sharma",
        "role": "volunteer",
        "org_key": None,
    },
    {
        "email": "admin@surpluslink.ai",
        "name": "Platform Dispatch Admin",
        "role": "admin",
        "org_key": None,
    },
]

DEMO_LISTINGS = [
    {
        "donor_email": "chef@spiceroute.com",
        "title": "40 plates veg biryani & cucumber raita",
        "raw_description": (
            "40 plates veg biryani & cucumber raita from Spice Route Restaurant, "
            "MG Road before 9 PM"
        ),
        "category": "Cooked Meals",
        "quantity": 40,
        "unit": "plates",
        "hours_left": 6,
        "pickup_venue": "MG Road, Metro Pillar 42",
        "status": "listed",
        "accepted_email": None,
    },
    {
        "donor_email": "chef@spiceroute.com",
        "title": "25 kg steamed rice and dal",
        "raw_description": "25 kg rice and dal, pickup before 6 PM from Spice Route Restaurant",
        "category": "Cooked Meals",
        "quantity": 25,
        "unit": "kg",
        "hours_left": 5,
        "pickup_venue": "MG Road, Metro Pillar 42",
        "status": "accepted",
        "accepted_email": "sewa@kitchen.org",
    },
    {
        "donor_email": "donor@campus.edu",
        "title": "Artisan sourdough bread, buns & assorted cakes",
        "raw_description": "Bread, buns and cake trays 12kg at Main Auditorium till 10:30 pm",
        "category": "Bakery",
        "quantity": 12,
        "unit": "kg",
        "hours_left": 4,
        "pickup_venue": "Main Auditorium, Campus Gate 1",
        "status": "listed",
        "accepted_email": None,
    },
    {
        "donor_email": "donor@campus.edu",
        "title": "35 kg seasonal apples & ripe bananas",
        "raw_description": "35 kg apples and bananas from Campus Gate 2 before 8 PM",
        "category": "Produce",
        "quantity": 35,
        "unit": "kg",
        "hours_left": 7,
        "pickup_venue": "University Campus Gate 2",
        "status": "collected",
        "accepted_email": "roti@rotibank.org",
    },
]


@router.post("/seed", response_model=MessageOut)
async def seed_demo_data(db: DbSession) -> MessageOut:
    """Seed demo users, organisations, and listings once."""
    count = await db.scalar(select(func.count()).select_from(User))
    if count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Demo data can only be seeded into an empty user table.",
        )

    now = utcnow()
    password_hash = hash_password(DEMO_PASSWORD)

    org_by_key: dict[str, Organisation] = {}
    for item in PRESET_ORGS:
        organisation = Organisation(**{k: v for k, v in item.items() if k != "key"})
        db.add(organisation)
        org_by_key[item["key"]] = organisation
    await db.flush()
    org_by_id = {organisation.id: organisation for organisation in org_by_key.values()}

    user_by_email: dict[str, User] = {}
    for item in PRESET_USERS:
        user = User(
            name=item["name"],
            email=item["email"],
            role=item["role"],
            organisation_id=org_by_key[item["org_key"]].id if item["org_key"] else None,
            password_hash=password_hash,
            created_at=now,
        )
        db.add(user)
        user_by_email[item["email"]] = user
    await db.flush()

    for item in DEMO_LISTINGS:
        donor = user_by_email[item["donor_email"]]
        accepted = user_by_email.get(item["accepted_email"]) if item["accepted_email"] else None
        donor_organisation = org_by_id.get(donor.organisation_id)
        listing = FoodListing(
            donor_user_id=donor.id,
            organisation_id=donor.organisation_id,
            title=item["title"],
            raw_description=item["raw_description"],
            category=item["category"],
            quantity=item["quantity"],
            unit=item["unit"],
            available_until=now + timedelta(hours=item["hours_left"]),
            pickup_venue=item["pickup_venue"],
            latitude=donor_organisation.latitude if donor_organisation else None,
            longitude=donor_organisation.longitude if donor_organisation else None,
            handling_notes="Handle with care. Keep sealed until handover.",
            missing_fields_flagged=False,
            status=item["status"],
            accepted_ngo_id=accepted.id if accepted else None,
            rescue_session_id=None,
            created_at=now,
        )
        db.add(listing)

    await db.commit()

    return MessageOut(
        message=(
            "Seeded demo organisations, users, and listings. "
            f"Password for all accounts: {DEMO_PASSWORD}"
        )
    )
