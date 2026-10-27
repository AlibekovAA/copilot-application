from pydantic import BaseModel, Field


class ChatResponse(BaseModel):
    response: str
    message_id: int = Field(..., description="ID created assistant message")
    conversation_id: int = Field(..., description="Actual conversation ID from DB")
    status: str = "success"
