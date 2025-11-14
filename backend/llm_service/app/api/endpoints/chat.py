from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.prompts import get_system_prompt
from app.repositories import MessageRepository
from app.schemas import ChatRequest, ChatResponse
from app.utils import log


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(
    request_body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    conversation_id = request_body.conversation_id
    domain = request_body.domain or "general"
    user_message = request_body.message

    log.info(
        f"Chat request received - conversation_id: {conversation_id}, domain: {domain}, "
        f"message length: {len(user_message)} characters"
    )

    try:
        message_repo = MessageRepository(db)

        is_first_message = await message_repo.check_if_first_message(conversation_id)
        log.info(f"Is first message in conversation {conversation_id}: {is_first_message}")

        enriched_prompt = None
        if is_first_message:
            system_prompt = get_system_prompt(domain)
            enriched_prompt = f"{system_prompt}\n\n{user_message}"
            log.info(f"First message detected - enriched with system prompt for domain: {domain}")

        history = await message_repo.get_last_messages(conversation_id, limit=5)
        log.info(f"Loaded {len(history)} history messages for context")

        history_messages = [{"role": msg.role, "content": msg.content} for msg in history]

        user_msg_record = await message_repo.save_message(
            conversation_id=conversation_id,
            role="user",
            content=user_message,
            enriched_prompt=enriched_prompt,
        )
        log.info(f"Saved user message with id: {user_msg_record.message_id}")

        mistral_service = request.app.state.mistral_service
        response_text = await mistral_service.generate(
            prompt=user_message,
            domain=domain,
            history_messages=history_messages,
        )

        log.info(f"Chat response generated - domain: {domain}, response length: {len(response_text)} characters")
        log.debug(f"Generated response preview: {response_text[:200]}...")

        assistant_msg_record = await message_repo.save_message(
            conversation_id=conversation_id,
            role="assistant",
            content=response_text,
        )
        log.info(f"Saved assistant message with id: {assistant_msg_record.message_id}")

        return ChatResponse(
            response=response_text,
            message_id=assistant_msg_record.message_id,
            status="success",
        )

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
