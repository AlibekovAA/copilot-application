from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services import MistralService
from app.utils import log


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("Application startup")

    mistral_service = MistralService()
    app.state.mistral_service = mistral_service
    log.info("Mistral service initialized")

    yield

    log.info("Application shutdown - closing services")
    await mistral_service.close()
    log.info("Mistral service closed")
