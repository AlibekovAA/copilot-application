from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    domain: str | None = Field(
        default=None,
        description="Domain: legal, marketing, finance, general",
    )


class ChatResponse(BaseModel):
    response: str
    status: str = "success"
