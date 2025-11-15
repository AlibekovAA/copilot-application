from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


if TYPE_CHECKING:
    from app.models.conversation import Conversation


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
        Index("ix_messages_conversation_id", "conversation_id"),
    )

    message_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )
    role: Mapped[str] = mapped_column(
        Text,
        CheckConstraint("role IN ('user', 'assistant')"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    file_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    enriched_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    conversation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("conversations.conversation_id"),
        nullable=False,
    )

    conversation: Mapped[Conversation] = relationship(
        "Conversation",
        back_populates="messages",
    )
