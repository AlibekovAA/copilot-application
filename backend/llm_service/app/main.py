from fastapi import FastAPI

from app.api import api_router
from app.core import get_settings
from app.core.events import lifespan
from app.middleware.cors import add_cors_middleware


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

add_cors_middleware(app)
app.include_router(api_router)
