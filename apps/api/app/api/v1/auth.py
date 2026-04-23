from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from pydantic import BaseModel

from app.core.auth import COOKIE_NAME, make_session_token, verify_session_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    password: str


class AuthStatus(BaseModel):
    authenticated: bool


@router.post("/login", response_model=AuthStatus)
def login(body: LoginBody, response: Response) -> AuthStatus:
    if body.password != settings.admin_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密碼錯誤")
    token = make_session_token()
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )
    return AuthStatus(authenticated=True)


@router.post("/logout", response_model=AuthStatus)
def logout(response: Response) -> AuthStatus:
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return AuthStatus(authenticated=False)


@router.get("/me", response_model=AuthStatus)
def me(admin_session: Annotated[str | None, Cookie(alias=COOKIE_NAME)] = None) -> AuthStatus:
    return AuthStatus(authenticated=verify_session_token(admin_session))
