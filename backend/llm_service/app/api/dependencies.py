from typing import Annotated, cast

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import get_db
from app.repositories import ConversationRepository, MessageRepository
from app.services import MistralService


def get_conversation_repo(
    db: AsyncSession = Depends(get_db),
) -> ConversationRepository:
    return ConversationRepository(db)


def get_message_repo(
    db: AsyncSession = Depends(get_db),
) -> MessageRepository:
    return MessageRepository(db)


def get_mistral_service(request: Request) -> MistralService:
    return cast(MistralService, request.app.state.mistral_service)


ConversationRepoDep = Annotated[ConversationRepository, Depends(get_conversation_repo)]
MessageRepoDep = Annotated[MessageRepository, Depends(get_message_repo)]
MistralServiceDep = Annotated[MistralService, Depends(get_mistral_service)]
