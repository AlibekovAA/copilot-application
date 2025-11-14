from fastapi import APIRouter, status
from pydantic import BaseModel

from app.utils import log


router = APIRouter()


class HealthResponse(BaseModel):
    status: str = "ok"


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check() -> HealthResponse:
    log.debug("Health check called")
    return HealthResponse()
