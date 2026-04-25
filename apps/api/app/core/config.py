from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Match Monitor API"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./match_monitor.db"
    cors_origins: list[str] = ["http://localhost:3000"]
    upload_root: str = "uploads"

    # Shared-password cookie auth.
    # Two roles: admin (full control) and referee (only call/clear-call on /live).
    # Change in .env / Fly secrets for production. If REFEREE_PASSWORD == ADMIN_PASSWORD,
    # admin wins — referee password is effectively disabled.
    admin_password: str = "changeme"
    referee_password: str = "changeme-referee"
    session_secret: str = "dev-secret-change-me"
    session_ttl_seconds: int = 12 * 60 * 60  # 12 hours
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
