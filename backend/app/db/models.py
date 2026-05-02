from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime, timezone
import uuid


def _now():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name           = Column(String, nullable=False)
    email          = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at     = Column(DateTime, default=_now)

    sessions       = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    interview_sessions = relationship("SessionMeta", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    """HTTP session token stored server-side."""
    __tablename__ = "user_sessions"

    token      = Column(String, primary_key=True)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=_now)

    user = relationship("User", back_populates="sessions")


class SessionMeta(Base):
    """One row per interview session."""
    __tablename__ = "session_meta"

    session_id       = Column(String, primary_key=True)
    user_id          = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    candidate_name   = Column(String)
    role             = Column(String)
    topics           = Column(String)           # JSON-encoded list
    turn_count       = Column(Integer, default=0)
    overall_score    = Column(Float,   nullable=True)
    session_complete = Column(Boolean, default=False)
    created_at       = Column(DateTime, default=_now)

    user = relationship("User", back_populates="interview_sessions")
