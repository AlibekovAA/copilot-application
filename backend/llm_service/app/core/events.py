from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.database import engine
from app.services import MistralService
from app.utils import log


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("Application startup")

    mistral_service = MistralService()
    app.state.mistral_service = mistral_service
    log.info("Mistral service initialized")

    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda _: None)
        log.info("Database connection established successfully")
    except Exception as e:
        log.error(f"Failed to connect to database: {e}")
        raise

    yield

    log.info("Application shutdown - closing services")
    await mistral_service.close()
    log.info("Mistral service closed")

    await engine.dispose()
    log.info("Database connection closed")
