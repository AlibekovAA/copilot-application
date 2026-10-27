from collections.abc import AsyncIterator
from typing import TypedDict

from sqlalchemy import func, select, tuple_

from app.models import Message
from app.repositories.base import BaseRepository


class MessageResponse(TypedDict):
    id: int
    role: str
    content: str
    timestamp: str


class MessageRepository(BaseRepository):
    def save_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
        )
        self.session.add(message)
        return message

    async def get_last_messages(self, conversation_id: int, limit: int = 5) -> list[dict[str, str]]:
        subquery = (
            select(Message.role, Message.content, Message.created_at, Message.message_id)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc(), Message.message_id.desc())
            .limit(limit)
            .subquery()
        )

        stmt = select(subquery.c.role, subquery.c.content).order_by(
            subquery.c.created_at.asc(), subquery.c.message_id.asc()
        )

        result = await self.session.execute(stmt)
        messages = [{"role": row.role, "content": row.content} for row in result.all()]
        return messages

    async def get_messages(self, conversation_id: int, limit: int, offset: int = 0) -> list[MessageResponse]:
        stmt = (
            select(Message.message_id, Message.role, Message.content, Message.created_at)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc(), Message.message_id.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return [
            MessageResponse(id=row.message_id, role=row.role, content=row.content, timestamp=row.created_at.isoformat())
            for row in result.all()
        ]

    async def iter_messages(self, conversation_id: int, batch_size: int = 100) -> AsyncIterator[MessageResponse]:
        ceiling = await self.session.scalar(
            select(func.max(Message.message_id)).where(Message.conversation_id == conversation_id)
        )
        await self.session.rollback()
        if ceiling is None:
            return
        cursor = None
        while True:
            stmt = (
                select(Message.message_id, Message.role, Message.content, Message.created_at)
                .where(Message.conversation_id == conversation_id, Message.message_id <= ceiling)
                .order_by(Message.created_at.asc(), Message.message_id.asc())
                .limit(batch_size)
            )
            if cursor is not None:
                stmt = stmt.where(tuple_(Message.created_at, Message.message_id) > cursor)
            result = await self.session.execute(stmt)
            rows = result.all()
            await self.session.rollback()
            if not rows:
                return
            for row in rows:
                yield MessageResponse(
                    id=row.message_id, role=row.role, content=row.content, timestamp=row.created_at.isoformat()
                )
            cursor = (rows[-1].created_at, rows[-1].message_id)
            if len(rows) < batch_size:
                return
