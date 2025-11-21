import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.database import engine
from app.services import MistralService
from app.utils import log


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("Application startup")

    settings = get_settings()
    mistral_service = MistralService()
    app.state.mistral_service = mistral_service
    log.info("Mistral service initialized")

    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda _: None)
        log.info("Database connection established successfully")
    except (SQLAlchemyError, ConnectionError, OSError) as e:
        log.error(f"Failed to connect to database: {e}")
        raise

    yield

    log.info("Application shutdown - starting graceful shutdown")
    shutdown_timeout = settings.SHUTDOWN_TIMEOUT

    async def close_mistral() -> None:
        try:
            await mistral_service.close(timeout=shutdown_timeout / 2)
            log.info("Mistral service closed")
        except (TimeoutError, RuntimeError, ValueError) as e:
            log.warning(f"Error closing Mistral service: {e}")

    async def close_database() -> None:
        try:
            await asyncio.wait_for(engine.dispose(), timeout=shutdown_timeout / 2)
            log.info("Database connections closed")
        except TimeoutError:
            log.warning("Database close timeout exceeded")
        except (RuntimeError, ValueError) as e:
            log.warning(f"Error closing database: {e}")

    shutdown_tasks = [
        asyncio.create_task(close_mistral()),
        asyncio.create_task(close_database()),
    ]

    try:
        await asyncio.wait_for(
            asyncio.gather(*shutdown_tasks, return_exceptions=True),
            timeout=shutdown_timeout,
        )
    except TimeoutError:
        log.warning(f"Shutdown timeout ({shutdown_timeout}s) exceeded, cancelling tasks")
        for task in shutdown_tasks:
            if not task.done():
                task.cancel()
        try:
            await asyncio.gather(*shutdown_tasks, return_exceptions=True)
        except (RuntimeError, asyncio.CancelledError):
            pass

    try:
        if hasattr(log, "_queue_listener"):
            log._queue_listener.stop()
            log.info("Logger closed")
    except (RuntimeError, AttributeError) as e:
        log.warning(f"Error closing logger: {e}")

    log.info("Application shutdown complete")
