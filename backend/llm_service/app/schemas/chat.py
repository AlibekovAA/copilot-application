from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: int = Field(..., description="Conversation ID", gt=0)
    message: str = Field(..., min_length=1, max_length=10000)
    domain: str | None = Field(
        default=None,
        description="Domain: legal, marketing, finance, sales, management, hr, general (default: general)",
    )


class ChatResponse(BaseModel):
    response: str
    message_id: int = Field(..., description="ID created assistant message")
    conversation_id: int = Field(..., description="Actual conversation ID from DB")
    status: str = "success"
