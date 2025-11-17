from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Copilot LLM Service"
    app_version: str = "0.1.0"
    debug: bool = False

    LOG_LEVEL: int = Field(default=0)
    LOG_DIR: str = Field(default="/app/logs")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:postgres@db:5432/db",
        description="PostgreSQL connection URL",
    )

    MISTRAL_API_KEY: str = Field(default="", description="API key Mistral AI")
    MISTRAL_MODEL: str = Field(default="mistral-small-latest", description="Mistral AI model")
    MISTRAL_BASE_URL: str = Field(default="https://api.mistral.ai/v1", description="Mistral AI API base URL")
    MISTRAL_TIMEOUT: float = Field(default=120.0, description="Request timeout in seconds")

    JWT_SECRET: str = Field(default="", description="JWT secret key for token validation")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
