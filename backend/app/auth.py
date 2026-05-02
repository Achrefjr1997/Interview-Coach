import secrets
from datetime import datetime, timezone, timedelta
from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.db.database import get_db
from app.db.models import User, UserSession
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def create_session(user: User, response: Response, db: AsyncSession) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.session_ttl_hours)
    db.add(UserSession(token=token, user_id=user.id, expires_at=expires))
    await db.commit()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,      # set True in production behind HTTPS
        max_age=settings.session_ttl_hours * 3600,
    )
    return token


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias="coach_session"),
) -> User:
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserSession).where(
            UserSession.token == session_token,
            UserSession.expires_at > now,
        )
    )
    user_session = result.scalar_one_or_none()
    if not user_session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    result2 = await db.execute(select(User).where(User.id == user_session.user_id))
    user = result2.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
