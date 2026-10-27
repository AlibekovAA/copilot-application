from sqlalchemy import delete, func, select
from sqlalchemy.orm import with_expression

from app.models import Conversation, Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository):
    def create_conversation(
        self,
        user_id: int,
        title: str = "Новый диалог",
        business_context: str | None = None,
    ) -> Conversation:
        conversation = Conversation(
            user_id=user_id,
            title=title,
            business_context=business_context,
        )
        self.session.add(conversation)
        return conversation

    async def get_conversations_by_user(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Conversation], int]:
        total = await self.session.scalar(
            select(func.count()).select_from(Conversation).where(Conversation.user_id == user_id)
        )
        page = (
            select(Conversation.conversation_id)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc(), Conversation.conversation_id.desc())
            .limit(limit)
            .offset(offset)
            .cte("conversation_page")
        )
        message_counts = (
            select(Message.conversation_id, func.count(Message.message_id).label("messages_count"))
            .where(Message.conversation_id.in_(select(page.c.conversation_id)))
            .group_by(Message.conversation_id)
            .subquery()
        )
        stmt = (
            select(Conversation)
            .join(page, Conversation.conversation_id == page.c.conversation_id)
            .outerjoin(message_counts, Conversation.conversation_id == message_counts.c.conversation_id)
            .options(with_expression(Conversation.messages_count, func.coalesce(message_counts.c.messages_count, 0)))
            .order_by(Conversation.created_at.desc(), Conversation.conversation_id.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total or 0

    async def get_conversation_by_id(self, conversation_id: int, user_id: int) -> Conversation | None:
        stmt = select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        result = await self.session.execute(
            delete(Conversation)
            .where(Conversation.conversation_id == conversation_id, Conversation.user_id == user_id)
            .returning(Conversation.conversation_id)
        )
        return result.scalar_one_or_none() is not None
