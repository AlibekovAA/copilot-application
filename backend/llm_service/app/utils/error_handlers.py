from fastapi import HTTPException, status
from jose import JWTError

from app.utils.logger import log


def handle_api_error(error: Exception, context: str = "API operation") -> HTTPException:
    log.error(f"Error in {context}", exc_info=True)

    if isinstance(error, HTTPException):
        return error

    if isinstance(error, ValueError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error",
    )


def handle_jwt_error(error: JWTError) -> HTTPException:
    log.error(f"JWT validation error: {error}")
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def handle_user_id_error(error: Exception) -> HTTPException:
    log.error(f"Invalid user_id in token: {error}")
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid user_id in token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_missing_auth_header() -> HTTPException:
    log.warning("Missing Authorization header")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authorization header",
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_invalid_auth_format() -> HTTPException:
    log.warning("Invalid Authorization header format")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authorization header format",
        headers={"WWW-Authenticate": "Bearer"},
    )


def raise_missing_user_id() -> HTTPException:
    log.error("Token does not contain user_id")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token: missing user_id",
        headers={"WWW-Authenticate": "Bearer"},
    )
