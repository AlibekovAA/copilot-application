import asyncio
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.services import MistralService
from app.utils import log


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    log.info("Application startup")
    settings = get_settings()
    mistral_service: MistralService | None = None
    try:
        mistral_service = MistralService()
        app.state.mistral_service = mistral_service
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        log.info("Mistral service and database connection initialized")
        yield
    finally:
        log.info("Application shutdown - releasing resources")
        try:
            if mistral_service is not None:
                await mistral_service.close(timeout=settings.SHUTDOWN_TIMEOUT / 2)
        finally:
            try:
                await asyncio.wait_for(engine.dispose(), timeout=settings.SHUTDOWN_TIMEOUT / 2)
            except (TimeoutError, RuntimeError, OSError) as error:
                log.error(f"Database shutdown failed: {error}", exc_info=True)
                raise
        log.info("Application shutdown complete")
