from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories import ConversationRepository
from app.schemas import ConversationCreate, ConversationListResponse, ConversationResponse
from app.utils import log


router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    user_id: int,
    request_body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    log.info(f"Creating new conversation for user {user_id}: {request_body.title}")

    try:
        conversation_repo = ConversationRepository(db)

        conversation = await conversation_repo.create_conversation(
            user_id=user_id,
            title=request_body.title,
            business_context=request_body.business_context,
        )

        log.info(f"Created conversation {conversation.conversation_id} for user {user_id}")

        return ConversationResponse(
            conversation_id=conversation.conversation_id,
            title=conversation.title,
            business_context=conversation.business_context,
            created_at=conversation.created_at,
            user_id=conversation.user_id,
            messages_count=0,
        )

    except Exception as e:
        log.error(f"Error creating conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e


@router.get("/conversations", response_model=ConversationListResponse, status_code=status.HTTP_200_OK)
async def get_conversations(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    log.info(f"Fetching conversations for user {user_id} (limit={limit}, offset={offset})")

    try:
        conversation_repo = ConversationRepository(db)

        conversations, total = await conversation_repo.get_conversations_by_user(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

        log.info(f"Found {len(conversations)} conversations for user {user_id} (total: {total})")

        conversation_responses = [
            ConversationResponse(
                conversation_id=conv.conversation_id,
                title=conv.title,
                business_context=conv.business_context,
                created_at=conv.created_at,
                user_id=conv.user_id,
                messages_count=getattr(conv, "messages_count", 0),
            )
            for conv in conversations
        ]

        return ConversationListResponse(
            conversations=conversation_responses,
            total=total,
        )

    except Exception as e:
        log.error(f"Error fetching conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e
