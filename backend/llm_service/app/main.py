from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.events import lifespan


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.include_router(api_router)
