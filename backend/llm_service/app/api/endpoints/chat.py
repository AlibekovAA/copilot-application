from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import ChatFormDep, ConversationServiceDep, MessageRepoDep, MistralServiceDep
from app.core import get_db
from app.middleware import get_current_user_id
from app.prompts import get_system_prompt
from app.schemas import ChatResponse
from app.services import FileProcessingService
from app.utils import api_operation, log


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(
    conversation_service: ConversationServiceDep,
    message_repo: MessageRepoDep,
    mistral_service: MistralServiceDep,
    form: ChatFormDep,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> ChatResponse:
    log.info(
        f"Chat request - user: {user_id}, conv: {form.conversation_id}, "
        f"domain: {form.domain}, message len: {len(form.message)}, files: {len(form.files)}"
    )

    async with api_operation("chat endpoint", db):
        actual_conversation_id = await conversation_service.validate_conversation_access(form.conversation_id, user_id)

        history = await message_repo.get_last_messages(actual_conversation_id, limit=3)
        await db.rollback()

        processed_files = []
        if form.files:
            processed_files = await FileProcessingService.process_files(form.files)

        system_prompt = get_system_prompt(form.domain)

        full_message = form.message
        if processed_files:
            files_content = FileProcessingService.format_files_for_prompt(processed_files)
            full_message = f"{form.message}\n\n{files_content}"

        response_text = await mistral_service.generate(
            prompt=full_message,
            system_prompt=system_prompt,
            history_messages=history,
        )

        log.info(f"Response generated: {len(response_text)} chars")

        await conversation_service.validate_conversation_access(actual_conversation_id, user_id)

        user_msg_record = message_repo.save_message(
            conversation_id=actual_conversation_id,
            role="user",
            content=form.message,
        )

        assistant_msg_record = message_repo.save_message(
            conversation_id=actual_conversation_id,
            role="assistant",
            content=response_text,
        )

        await db.commit()

        log.info(f"Saved messages: user={user_msg_record.message_id}, assistant={assistant_msg_record.message_id}")

        return ChatResponse(
            response=response_text,
            message_id=assistant_msg_record.message_id,
            conversation_id=actual_conversation_id,
            status="success",
        )
