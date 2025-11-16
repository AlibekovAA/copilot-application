from fastapi import HTTPException, status

from app.repositories import ConversationRepository
from app.utils import log


class ConversationService:
    def __init__(self, conversation_repo: ConversationRepository) -> None:
        self.conversation_repo = conversation_repo

    async def validate_conversation_access(
        self,
        conversation_id: int,
        user_id: int,
    ) -> int:
        conversation = await self.conversation_repo.get_conversation_by_id(conversation_id, user_id=user_id)

        if conversation is None:
            log.error(f"Conversation {conversation_id} not found for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found",
            )

        return conversation.conversation_id
