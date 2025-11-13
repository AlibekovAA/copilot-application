from fastapi import APIRouter, status

from app.schemas.chat import ChatRequest, ChatResponse
from app.utils.logger import logger


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    logger.info(f"Chat request: {request.message}")

    response_text = f"Echo: {request.message}"

    return ChatResponse(response=response_text)
