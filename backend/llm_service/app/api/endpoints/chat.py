from fastapi import APIRouter, HTTPException, Request, status

from app.schemas import ChatRequest, ChatResponse
from app.utils import log


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(request_body: ChatRequest, request: Request) -> ChatResponse:
    domain = request_body.domain or "general"

    log.info(f"Chat request received - domain: {domain}, message length: {len(request_body.message)} characters")

    try:
        mistral_service = request.app.state.mistral_service
        response_text = await mistral_service.generate(
            prompt=request_body.message,
            domain=domain,
        )

        log.info(f"Chat response generated - domain: {domain}, response length: {len(response_text)} characters")
        log.debug(f"Generated response preview: {response_text[:200]}...")

        return ChatResponse(response=response_text, status="success")

    except ValueError as e:
        log.error(f"Validation error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        log.error(f"Unexpected error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e
