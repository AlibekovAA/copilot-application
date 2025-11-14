from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    user_id: int = Field(..., description="User ID from JWT", gt=0)
    conversation_id: int = Field(..., description="Conversation ID", gt=0)
    message: str = Field(..., min_length=1, max_length=10000)
    domain: str | None = Field(
        default=None,
        description="Domain: legal, marketing, finance, general (default: general)",
    )


class ChatResponse(BaseModel):
    response: str
    message_id: int = Field(..., description="ID created assistant message")
    conversation_id: int = Field(..., description="Actual conversation ID from DB")
    status: str = "success"
