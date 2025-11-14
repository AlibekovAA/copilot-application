from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = Field(default="Новый диалог", max_length=100)
    business_context: str | None = Field(
        default=None,
        description="Domain: legal, marketing, finance, sales, management, hr, general",
    )


class ConversationResponse(BaseModel):
    conversation_id: int
    title: str
    business_context: str | None
    created_at: datetime
    user_id: int
    messages_count: int = Field(default=0, description="Количество сообщений в диалоге")

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: list[ConversationResponse]
    total: int
