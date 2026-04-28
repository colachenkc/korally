from typing import Annotated

from fastapi import APIRouter, Cookie, Header, HTTPException, Response, status
from pydantic import BaseModel

from app.core.auth import (
    COOKIE_NAME,
    Role,
    extract_token,
    make_session_token,
    verify_session_token,
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    password: str


class AuthStatus(BaseModel):
    authenticated: bool
    role: Role | None = None
    token: str | None = None  # only populated on successful login


def _resolve_role(password: str) -> Role | None:
    """Admin password takes precedence if both happen to match."""
    if password == settings.admin_password:
        return "admin"
    if password == settings.referee_password:
        return "referee"
    return None


@router.post("/login", response_model=AuthStatus)
def login(body: LoginBody, response: Response) -> AuthStatus:
    role = _resolve_role(body.password)
    if role is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密碼錯誤")
    token = make_session_token(role)
    # Set cookie for first-party flows. For Safari / cross-origin, the client
    # falls back to using the returned token via Authorization header.
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )
    return AuthStatus(authenticated=True, role=role, token=token)


@router.post("/logout", response_model=AuthStatus)
def logout(response: Response) -> AuthStatus:
    # Cookie attributes must match set_cookie or browsers (especially cross-origin
    # SameSite=None+Secure) silently reject the deletion.
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
    return AuthStatus(authenticated=False, role=None)


@router.get("/me", response_model=AuthStatus)
def me(
    admin_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> AuthStatus:
    role = verify_session_token(extract_token(admin_session, authorization))
    return AuthStatus(authenticated=role is not None, role=role)
