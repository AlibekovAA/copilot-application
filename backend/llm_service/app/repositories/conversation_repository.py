from sqlalchemy import func, select

from app.models import Conversation, Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository):
    async def create_conversation(
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
        messages_count_subquery = (
            select(Message.conversation_id, func.count(Message.message_id).label("messages_count"))
            .group_by(Message.conversation_id)
            .subquery()
        )

        stmt = (
            select(
                Conversation,
                func.coalesce(messages_count_subquery.c.messages_count, 0).label("msg_count"),
                func.count().over().label("total_count"),
            )
            .outerjoin(
                messages_count_subquery, Conversation.conversation_id == messages_count_subquery.c.conversation_id
            )
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        if not rows:
            return [], 0

        conversations = []
        total = rows[0][2] if rows else 0

        for row in rows:
            conversation = row[0]
            conversation.messages_count = row[1]
            conversations.append(conversation)

        return conversations, total

    async def get_conversation_by_id(self, conversation_id: int, user_id: int) -> Conversation | None:
        stmt = select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete_conversation(self, conversation_id: int, user_id: int) -> bool:
        conversation = await self.get_conversation_by_id(conversation_id, user_id)
        if conversation is None:
            return False
        await self.session.delete(conversation)
        return True
