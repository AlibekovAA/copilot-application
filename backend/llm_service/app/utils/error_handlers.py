from fastapi import HTTPException, status

from app.utils.logger import log


def handle_api_error(error: Exception, context: str = "API operation") -> HTTPException:
    log.error(f"Error in {context}", exc_info=True)

    if isinstance(error, ValueError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error",
    )
