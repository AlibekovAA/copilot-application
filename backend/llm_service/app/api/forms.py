from dataclasses import dataclass

from fastapi import File, Form, UploadFile


@dataclass(frozen=True, slots=True)
class ChatForm:
    conversation_id: int
    message: str
    domain: str
    files: list[UploadFile]


def get_chat_form(
    conversation_id: int = Form(..., description="Conversation ID", gt=0),
    message: str = Form(..., description="Message text", min_length=1, max_length=10000),
    domain: str | None = Form(None, description="Domain: legal, marketing, finance, sales, management, hr, general"),
    files: list[UploadFile] = File(default=[], description="Attached files"),
) -> ChatForm:
    return ChatForm(
        conversation_id=conversation_id,
        message=message,
        domain=domain or "general",
        files=files,
    )
