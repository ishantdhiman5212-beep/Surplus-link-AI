"""Timezone helpers shared by persistence, schemas, and matching."""

from datetime import UTC, datetime

from sqlalchemy import DateTime, TypeDecorator


class UTCDateTime(TypeDecorator):
    """A DateTime that is always timezone-aware in Python.

    SQLite drops timezone information, so naive values are interpreted as UTC.
    PostgreSQL keeps native ``timestamptz`` columns unchanged.
    """

    impl = DateTime
    cache_ok = True

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("timezone", True)
        super().__init__(*args, **kwargs)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        normalized = ensure_utc(value)
        if dialect.name == "sqlite":
            return normalized.replace(tzinfo=None)
        return normalized

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return ensure_utc(value)


def ensure_utc(value: datetime) -> datetime:
    """Return an aware UTC datetime, treating naive values as UTC.

    SQLite stores ``DateTime(timezone=True)`` without an offset. Normalizing at
    the boundaries keeps comparisons with PostgreSQL's ``timestamptz`` safe.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
