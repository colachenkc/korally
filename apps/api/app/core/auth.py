"""Minimal shared-password admin auth: HMAC-signed cookie session."""

import base64
import hashlib
import hmac
import time
from typing import Annotated

from fastapi import Cookie, HTTPException, status

from app.core.config import settings

COOKIE_NAME = "admin_session"


def _sign(payload: str) -> str:
    mac = hmac.new(settings.session_secret.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


def make_session_token(ttl_seconds: int | None = None) -> str:
    ttl = ttl_seconds if ttl_seconds is not None else settings.session_ttl_seconds
    expires_at = int(time.time()) + ttl
    payload = str(expires_at)
    return f"{payload}.{_sign(payload)}"


def verify_session_token(token: str | None) -> bool:
    if not token:
        return False
    try:
        payload, signature = token.rsplit(".", 1)
    except ValueError:
        return False
    expected = _sign(payload)
    if not hmac.compare_digest(signature, expected):
        return False
    try:
        return int(payload) > int(time.time())
    except ValueError:
        return False


def require_admin(
    admin_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
) -> None:
    if not verify_session_token(admin_session):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
        )
