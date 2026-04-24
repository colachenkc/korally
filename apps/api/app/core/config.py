from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Match Monitor API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./match_monitor.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    upload_root: str = "uploads"

    # Admin auth (shared password cookie session).
    # Change ADMIN_PASSWORD and SESSION_SECRET in .env for production.
    admin_password: str = "changeme"
    session_secret: str = "dev-secret-change-me"
    session_ttl_seconds: int = 12 * 60 * 60  # 12 hours
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
