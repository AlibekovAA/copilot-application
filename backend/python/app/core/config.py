from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Copilot LLM Service"
    app_version: str = "0.1.0"
    debug: bool = False

    LOG_LEVEL: int = Field(default=0)
    LOG_DIR: str = Field(default="./logs")

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
