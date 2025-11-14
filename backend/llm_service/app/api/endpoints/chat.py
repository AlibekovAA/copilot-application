from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.prompts import get_system_prompt
from app.repositories import ConversationRepository, MessageRepository
from app.schemas import ChatRequest, ChatResponse
from app.utils import log


router = APIRouter()


async def _validate_conversation(
    conversation_repo: ConversationRepository,
    conversation_id: int,
    user_id: int,
) -> int:
    conversation = await conversation_repo.get_conversation_by_id(conversation_id, user_id=user_id)
    if conversation is None:
        log.error(f"Conversation {conversation_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found. Please create it first.",
        )
    return conversation.conversation_id


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(
    request_body: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    domain = request_body.domain or "general"

    log.info(
        f"Chat request - user: {request_body.user_id}, conv: {request_body.conversation_id}, "
        f"domain: {domain}, len: {len(request_body.message)}"
    )

    try:
        message_repo = MessageRepository(db)
        conversation_repo = ConversationRepository(db)

        actual_conversation_id = await _validate_conversation(
            conversation_repo, request_body.conversation_id, request_body.user_id
        )

        history = await message_repo.get_last_messages(actual_conversation_id, limit=5)
        is_first_message = len(history) == 0

        enriched_prompt = None
        if is_first_message:
            system_prompt = get_system_prompt(domain)
            enriched_prompt = f"{system_prompt}\n\n{request_body.message}"
            log.info(f"First message - enriched with system prompt for domain: {domain}")

        user_msg_record = await message_repo.save_message(
            conversation_id=actual_conversation_id,
            role="user",
            content=request_body.message,
            enriched_prompt=enriched_prompt,
        )

        system_prompt = get_system_prompt(domain)
        response_text = await request.app.state.mistral_service.generate(
            prompt=request_body.message,
            system_prompt=system_prompt,
            history_messages=history,
        )

        log.info(f"Response generated: {len(response_text)} chars")

        assistant_msg_record = await message_repo.save_message(
            conversation_id=actual_conversation_id,
            role="assistant",
            content=response_text,
        )

        await db.commit()
        await db.refresh(user_msg_record)
        await db.refresh(assistant_msg_record)

        log.info(f"Saved messages: user={user_msg_record.message_id}, assistant={assistant_msg_record.message_id}")

        return ChatResponse(
            response=response_text,
            message_id=assistant_msg_record.message_id,
            conversation_id=actual_conversation_id,
            status="success",
        )

    except ValueError as e:
        log.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        log.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e
