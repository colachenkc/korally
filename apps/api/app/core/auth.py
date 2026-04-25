"""Shared-password cookie auth with two roles: admin and referee.

Token format: f"{role}|{expires}.{signature}" where signature = HMAC-SHA256
of "{role}|{expires}" with settings.session_secret. Signing covers role so
clients cannot tamper with privilege.
"""

import base64
import hashlib
import hmac
import time
from typing import Annotated, Literal

from fastapi import Cookie, HTTPException, status

from app.core.config import settings

COOKIE_NAME = "admin_session"

Role = Literal["admin", "referee"]
_ROLES: tuple[str, ...] = ("admin", "referee")


def _sign(payload: str) -> str:
    mac = hmac.new(settings.session_secret.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


def make_session_token(role: Role, ttl_seconds: int | None = None) -> str:
    ttl = ttl_seconds if ttl_seconds is not None else settings.session_ttl_seconds
    expires_at = int(time.time()) + ttl
    payload = f"{role}|{expires_at}"
    return f"{payload}.{_sign(payload)}"


def verify_session_token(token: str | None) -> Role | None:
    """Returns the validated role, or None if token is missing/invalid/expired."""
    if not token:
        return None
    try:
        payload, signature = token.rsplit(".", 1)
        role, expires_str = payload.split("|", 1)
    except ValueError:
        return None
    if role not in _ROLES:
        return None
    if not hmac.compare_digest(signature, _sign(payload)):
        return None
    try:
        if int(expires_str) <= int(time.time()):
            return None
    except ValueError:
        return None
    return role  # type: ignore[return-value]


def require_admin(
    admin_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
) -> Role:
    role = verify_session_token(admin_session)
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
        )
    return role


def require_referee_or_admin(
    admin_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
) -> Role:
    role = verify_session_token(admin_session)
    if role not in _ROLES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return role
