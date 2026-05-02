from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import User
from app.auth import hash_password, verify_password, create_session, get_current_user
import uuid

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name:     str
    email:    EmailStr
    password: str


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class UserOut(BaseModel):
    id:    str
    name:  str
    email: str


@router.post("/register", response_model=UserOut)
async def register(req: RegisterRequest, response: Response, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        id=str(uuid.uuid4()),
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await create_session(user, response, db)
    return UserOut(id=user.id, name=user.name, email=user.email)


@router.post("/login", response_model=UserOut)
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    await create_session(user, response, db)
    return UserOut(id=user.id, name=user.name, email=user.email)


@router.post("/logout")
async def logout(response: Response, user: User = Depends(get_current_user)):
    response.delete_cookie("coach_session")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, name=user.name, email=user.email)


@router.get("/token")
async def get_token(
    db: AsyncSession = Depends(get_db),
    session_token: str | None = Cookie(default=None, alias="coach_session"),
) -> dict:
    """Returns the raw session token so the frontend can use it for WebSocket auth."""
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"token": session_token}
