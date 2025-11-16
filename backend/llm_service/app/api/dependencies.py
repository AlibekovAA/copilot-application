from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import get_db
from app.repositories import ConversationRepository, MessageRepository


def get_conversation_repo(
    db: AsyncSession = Depends(get_db),
) -> ConversationRepository:
    return ConversationRepository(db)


def get_message_repo(
    db: AsyncSession = Depends(get_db),
) -> MessageRepository:
    return MessageRepository(db)


ConversationRepoDep = Annotated[ConversationRepository, Depends(get_conversation_repo)]
MessageRepoDep = Annotated[MessageRepository, Depends(get_message_repo)]
