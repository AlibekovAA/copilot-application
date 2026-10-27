from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    app_name: str = "Copilot LLM Service"
    app_version: str = "0.1.0"
    debug: bool = False

    LOG_LEVEL: int = Field(default=1, ge=0, le=4)
    LOG_DIR: str = Field(default="/app/logs")
    LOG_QUEUE_SIZE: int = Field(default=1000, gt=0)

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:postgres@db:5432/db",
        description="PostgreSQL connection URL",
    )

    MISTRAL_API_KEY: str = Field(default="", description="API key Mistral AI")
    MISTRAL_MODEL: str = Field(default="mistral-small-latest", description="Mistral AI model")
    MISTRAL_BASE_URL: str = Field(default="https://api.mistral.ai/v1", description="Mistral AI API base URL")
    MISTRAL_TIMEOUT: float = Field(default=120.0, gt=0, description="Request timeout in seconds")
    MOCK_MISTRAL: bool = False

    JWT_SECRET: str = Field(
        default="", min_length=1, validate_default=True, description="JWT secret key for token validation"
    )

    SHUTDOWN_TIMEOUT: float = Field(default=30.0, gt=0, description="Graceful shutdown timeout in seconds")

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, secret: str) -> str:
        if not secret.strip():
            raise ValueError("JWT_SECRET must not be empty")
        return secret


@lru_cache
def get_settings() -> Settings:
    return Settings()
