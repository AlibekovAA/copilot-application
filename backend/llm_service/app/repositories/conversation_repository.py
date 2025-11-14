from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, Message


class ConversationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

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
        await self.session.commit()
        await self.session.refresh(conversation)
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
            select(Conversation, func.coalesce(messages_count_subquery.c.messages_count, 0).label("msg_count"))
            .outerjoin(messages_count_subquery, Conversation.conversation_id == messages_count_subquery.c.conversation_id)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.session.execute(stmt)
        rows = result.all()

        conversations = []
        for row in rows:
            conversation = row[0]
            conversation.messages_count = row[1]
            conversations.append(conversation)

        count_stmt = select(func.count(Conversation.conversation_id)).where(Conversation.user_id == user_id)
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one()

        return conversations, total

    async def get_conversation_by_id(self, conversation_id: int, user_id: int) -> Conversation | None:
        stmt = select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
