from typing import cast

from fastapi import Request
from jose import JWTError, jwt

from app.core import get_settings
from app.utils.error_handlers import (
    handle_jwt_error,
    handle_user_id_error,
    raise_invalid_auth_format,
    raise_missing_auth_header,
    raise_missing_user_id,
)


settings = get_settings()


def get_current_user_id(request: Request) -> int:
    auth_header_raw: str | None = request.headers.get("Authorization")

    if not auth_header_raw:
        raise_missing_auth_header()

    auth_header: str = cast(str, auth_header_raw)

    if not auth_header.startswith("Bearer "):
        raise_invalid_auth_format()

    token: str = auth_header.replace("Bearer ", "")

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )

        user_id = payload.get("user_id")

        if user_id is None:
            raise_missing_user_id()

        return int(user_id)

    except JWTError as e:
        raise handle_jwt_error(e) from e
    except (ValueError, TypeError) as e:
        raise handle_user_id_error(e) from e
