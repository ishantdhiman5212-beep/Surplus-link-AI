"""Organisation endpoints."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth import CurrentUser, DbSession
from app.models import Organisation
from app.schemas import OrganisationCreate, OrganisationOut

router = APIRouter(prefix="/organisations", tags=["organisations"])


@router.post("", response_model=OrganisationOut, status_code=status.HTTP_201_CREATED)
async def create_organisation(
    payload: OrganisationCreate,
    db: DbSession,
    _user: CurrentUser,
) -> OrganisationOut:
    """Create an organisation record."""
    organisation = Organisation(**payload.model_dump())
    db.add(organisation)
    await db.commit()
    await db.refresh(organisation)
    return OrganisationOut.model_validate(organisation)


@router.get("", response_model=list[OrganisationOut])
async def list_organisations(db: DbSession) -> list[OrganisationOut]:
    """List all organisations."""
    result = await db.execute(select(Organisation).order_by(Organisation.name.asc()))
    return [OrganisationOut.model_validate(row) for row in result.scalars().all()]


@router.get("/{organisation_id}", response_model=OrganisationOut)
async def get_organisation(
    organisation_id: int,
    db: DbSession,
) -> OrganisationOut:
    """Fetch one organisation by id."""
    organisation = await db.get(Organisation, organisation_id)
    if organisation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organisation not found",
        )
    return OrganisationOut.model_validate(organisation)
