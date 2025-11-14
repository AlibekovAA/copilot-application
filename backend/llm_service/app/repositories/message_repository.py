from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, Message


class MessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        enriched_prompt: str | None = None,
        file_name: str | None = None,
        content_type: str | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            enriched_prompt=enriched_prompt,
            file_name=file_name,
            content_type=content_type,
        )
        self.session.add(message)
        await self.session.commit()
        await self.session.refresh(message)
        return message

    async def get_last_messages(self, conversation_id: int, limit: int = 5) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        messages = list(result.scalars().all())
        return list(reversed(messages))

    async def check_if_first_message(self, conversation_id: int) -> bool:
        stmt = select(Message.message_id).where(Message.conversation_id == conversation_id).limit(1)
        result = await self.session.execute(stmt)
        first_message = result.scalar_one_or_none()
        return first_message is None

    async def get_conversation_domain(self, conversation_id: int) -> str | None:
        stmt = select(Conversation.business_context).where(Conversation.conversation_id == conversation_id)
        result = await self.session.execute(stmt)
        domain = result.scalar_one_or_none()
        return domain

    async def get_conversation_by_id(self, conversation_id: int, user_id: int) -> Conversation | None:
        stmt = select(Conversation).where(
            Conversation.conversation_id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
