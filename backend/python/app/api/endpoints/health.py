from fastapi import APIRouter, status
from pydantic import BaseModel

from app.utils.logger import logger


router = APIRouter()


class HealthResponse(BaseModel):
    status: str = "ok"


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check() -> HealthResponse:
    logger.debug("Health check called")
    return HealthResponse()
