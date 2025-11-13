from functools import lru_cache

from fastapi import APIRouter, HTTPException, status

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.mistral_service import MistralService
from app.utils.logger import logger


router = APIRouter()


@lru_cache(maxsize=1)
def get_mistral_service() -> MistralService:
    return MistralService()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    domain = request.domain or "general"

    logger.info(f"Chat request received - domain: {domain}, message length: {len(request.message)} characters")

    try:
        mistral_service = get_mistral_service()
        response_text = await mistral_service.generate(
            prompt=request.message,
            domain=domain,
        )

        logger.info(f"Chat response generated - domain: {domain}, response length: {len(response_text)} characters")
        logger.debug(f"Generated response preview: {response_text[:200]}...")

        return ChatResponse(response=response_text, status="success")

    except ValueError as e:
        logger.error(f"Validation error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e
