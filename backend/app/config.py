from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", extra="ignore")

    env: str = "dev"
    db_url: str
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: str
    jwt_alg: str = "HS256"
    access_token_expire_minutes: int = 480

    seed_on_startup: bool = False


settings = Settings()  # type: ignore[call-arg]

