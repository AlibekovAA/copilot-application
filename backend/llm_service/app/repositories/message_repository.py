from sqlalchemy import select

from app.models import Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository):
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
        return message

    async def get_last_messages(self, conversation_id: int, limit: int = 5) -> list[dict[str, str]]:
        stmt = (
            select(Message.role, Message.content)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        messages = [{"role": row.role, "content": row.content} for row in result.all()]
        return list(reversed(messages))

    async def get_all_messages(self, conversation_id: int) -> list[dict[str, str]]:
        stmt = (
            select(Message.message_id, Message.role, Message.content, Message.created_at)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        result = await self.session.execute(stmt)
        messages = [
            {
                "id": row.message_id,
                "role": row.role,
                "content": row.content,
                "timestamp": row.created_at.isoformat(),
            }
            for row in result.all()
        ]
        return messages
