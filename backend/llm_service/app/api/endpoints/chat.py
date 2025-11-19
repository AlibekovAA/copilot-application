from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import ConversationRepoDep, MessageRepoDep
from app.core import get_db
from app.middleware import get_current_user_id
from app.prompts import get_system_prompt
from app.schemas import ChatResponse
from app.services import ConversationService, FileProcessingService, MistralService
from app.utils import handle_api_error, log


router = APIRouter()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(  # noqa: PLR0913, PLR0917
    request: Request,
    conversation_repo: ConversationRepoDep,
    message_repo: MessageRepoDep,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    conversation_id: int = Form(..., description="Conversation ID", gt=0),
    message: str = Form(..., description="Message text", min_length=1, max_length=10000),
    domain: str | None = Form(None, description="Domain: legal, marketing, finance, sales, management, hr, general"),
    files: list[UploadFile] = File(default=[], description="Attached files"),
) -> ChatResponse:
    domain = domain or "general"

    log.info(
        f"Chat request - user: {user_id}, conv: {conversation_id}, "
        f"domain: {domain}, message len: {len(message)}, files: {len(files)}"
    )

    try:
        conversation_service = ConversationService(conversation_repo)
        actual_conversation_id = await conversation_service.validate_conversation_access(conversation_id, user_id)

        processed_files = []
        if files:
            processed_files = await FileProcessingService.process_files(files)

        history = await message_repo.get_last_messages(actual_conversation_id, limit=3)
        is_first_message = len(history) == 0

        system_prompt = get_system_prompt(domain)

        full_message = message
        if processed_files:
            files_content = FileProcessingService.format_files_for_prompt(processed_files)
            full_message = f"{message}\n\n{files_content}"

        enriched_prompt = None
        if is_first_message:
            enriched_prompt = f"{system_prompt}\n\n{full_message}"
            log.info(f"First message - enriched with system prompt for domain: {domain}")

        response_text = await _generate_with_history_retry(
            mistral_service=request.app.state.mistral_service,
            prompt=full_message,
            system_prompt=system_prompt,
            history=history,
        )

        log.info(f"Response generated: {len(response_text)} chars")

        user_msg_record = await message_repo.save_message(
            conversation_id=actual_conversation_id,
            role="user",
            content=message,
            enriched_prompt=enriched_prompt,
        )

        assistant_msg_record = await message_repo.save_message(
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

    except (HTTPException, ValueError, SQLAlchemyError, RuntimeError, OSError) as e:
        await db.rollback()
        raise handle_api_error(e, "chat endpoint") from e


async def _generate_with_history_retry(
    mistral_service: MistralService,
    prompt: str,
    system_prompt: str,
    history: list[dict[str, str]],
) -> str:
    history_variants: list[list[dict[str, str]]] = []

    if history:
        history_variants.append(history)
        if len(history) > 1:
            history_variants.append(history[-1:])

    history_variants.append([])

    last_error: HTTPException | None = None

    for variant in history_variants:
        try:
            return await mistral_service.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                history_messages=variant,
            )
        except HTTPException as exc:
            if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS and variant:
                log.warning(f"Mistral returned 429 with {len(variant)} history messages, retrying with shorter context")
                last_error = exc
                continue
            raise

    if last_error is not None:
        raise last_error

    raise RuntimeError("Failed to generate response with available history variants")
