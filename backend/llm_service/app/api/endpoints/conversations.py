from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.repositories import ConversationRepository, MessageRepository
from app.schemas import ConversationCreate, ConversationListResponse, ConversationResponse
from app.utils import handle_api_error, log


router = APIRouter()

MAX_CONVERSATIONS_LIMIT = 100


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    user_id: int,
    request_body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    log.debug(f"Creating conversation for user {user_id}")

    try:
        conversation_repo = ConversationRepository(db)

        conversation = await conversation_repo.create_conversation(
            user_id=user_id,
            title=request_body.title,
            business_context=request_body.business_context,
        )

        await db.commit()
        await db.refresh(conversation)

        log.info(f"Created conversation {conversation.conversation_id}")

        return ConversationResponse(
            conversation_id=conversation.conversation_id,
            title=conversation.title,
            business_context=conversation.business_context,
            created_at=conversation.created_at,
            user_id=conversation.user_id,
            messages_count=0,
        )

    except Exception as e:
        raise handle_api_error(e, "create conversation") from e


@router.get("/conversations", response_model=ConversationListResponse, status_code=status.HTTP_200_OK)
async def get_conversations(
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    log.debug(f"Fetching conversations for user {user_id}")

    if limit < 1 or limit > MAX_CONVERSATIONS_LIMIT or offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid pagination parameters: limit must be between 1 and {MAX_CONVERSATIONS_LIMIT}, "
            "offset must be >= 0.",
        )

    try:
        conversation_repo = ConversationRepository(db)

        conversations, total = await conversation_repo.get_conversations_by_user(
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

        log.info(f"Found {len(conversations)} conversations (total: {total})")

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
        raise handle_api_error(e, "fetch conversations") from e


@router.get("/conversations/{conversation_id}/messages", status_code=status.HTTP_200_OK)
async def get_conversation_messages(
    conversation_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    log.debug(f"Fetching messages for conversation {conversation_id}, user {user_id}")

    try:
        conversation_repo = ConversationRepository(db)
        message_repo = MessageRepository(db)

        conversation = await conversation_repo.get_conversation_by_id(conversation_id, user_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found",
            )

        messages = await message_repo.get_all_messages(conversation_id)

        log.info(f"Found {len(messages)} messages for conversation {conversation_id}")

        return {
            "conversation_id": conversation_id,
            "messages": messages,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise handle_api_error(e, "fetch conversation messages") from e
