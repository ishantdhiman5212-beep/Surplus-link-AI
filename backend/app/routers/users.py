"""Public demo user directory used by the React client for display names."""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.auth import DbSession
from app.models import User
from app.schemas import UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
async def list_users(db: DbSession) -> list[UserOut]:
    """List demo users so the UI can resolve donor and NGO names."""
    result = await db.execute(select(User).order_by(User.name.asc()))
    return [UserOut.model_validate(row) for row in result.scalars().all()]


@router.get("/{user_id}", response_model=UserOut)
async def get_user(user_id: int, db: DbSession) -> UserOut:
    """Fetch one user by id."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)
