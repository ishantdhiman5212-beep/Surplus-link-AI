"""FastAPI application entry point for SurplusLink AI."""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.routers import (
    ai,
    auth,
    demo,
    donations,
    matching,
    organisations,
    pickups,
    rescue_sessions,
    users,
    websocket,
)

logger = logging.getLogger("surpluslink")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Run startup and shutdown tasks."""
    if settings.jwt_secret == "change-me-in-production-please-set-a-strong-secret":
        logger.warning("JWT_SECRET is still the default value; set it before deploying.")
    if settings.create_tables_on_startup:
        logger.warning("CREATE_TABLES_ON_STARTUP is enabled; Alembic is recommended.")
        await create_tables()
    logger.info("Database: %s", settings.safe_database_url)
    yield


app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
    description=(
        "REST and WebSocket backend for surplus food donations, rescue "
        "sessions, volunteer pickups, and verified handovers."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(matching.router, prefix="/api")
app.include_router(organisations.router, prefix="/api")
app.include_router(donations.router, prefix="/api")
app.include_router(pickups.router, prefix="/api")
app.include_router(rescue_sessions.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(websocket.router)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    """Simple health check compatible with the React frontend and Render."""
    return {
        "status": "healthy",
        "service": "SurplusLink AI Backend",
        "environment": settings.environment,
    }


@app.get("/", tags=["health"])
async def root() -> dict[str, str]:
    """Return basic API information."""
    return {
        "service": "SurplusLink AI Backend",
        "name": settings.project_name,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "api_prefix": "/api",
    }
