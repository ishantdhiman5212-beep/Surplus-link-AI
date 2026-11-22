"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings.

    Every value can be overridden with an environment variable or a `.env`
    file next to the backend package. The defaults target a local PostgreSQL
    instance, while `DATABASE_URL` can point at Neon in production.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    project_name: str = "SurplusLink AI"
    environment: str = "development"
    database_url: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/surplus_link_ai"
    )
    jwt_secret: str = "change-me-in-production-please-set-a-strong-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 12
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:5173,http://127.0.0.1:5173"
    )
    create_tables_on_startup: bool = False

    # NGO operating hours are local wall-clock times. Donation deadlines are
    # stored as UTC instants, so matching converts them before comparing.
    matching_time_zone: str = "Asia/Kolkata"
    matching_utc_offset_hours: float = 5.5

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse the comma separated CORS origin setting."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def _sqlalchemy_url(self, driver: str | None) -> str:
        url = self.database_url
        if driver and url.startswith(("postgresql://", "postgres://")):
            prefix = "postgresql://" if url.startswith("postgresql://") else "postgres://"
            url = f"postgresql+{driver}://" + url[len(prefix) :]
        elif url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        return url

    @property
    def async_database_url(self) -> str:
        """Return a URL accepted by SQLAlchemy's async engine."""
        return self._sqlalchemy_url("psycopg")

    @property
    def sync_database_url(self) -> str:
        """Return a URL accepted by Alembic and sync SQLAlchemy tooling."""
        return self._sqlalchemy_url("psycopg")

    @property
    def safe_database_url(self) -> str:
        """Database URL with the password masked, safe for logging."""
        if "://" not in self.database_url:
            return self.database_url
        scheme, remainder = self.database_url.split("://", 1)
        if "@" not in remainder:
            return self.database_url
        credentials, host = remainder.rsplit("@", 1)
        if ":" in credentials:
            user = credentials.split(":", 1)[0]
            credentials = f"{user}:***"
        return f"{scheme}://{credentials}@{host}"


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings instance."""
    return Settings()


settings = get_settings()
