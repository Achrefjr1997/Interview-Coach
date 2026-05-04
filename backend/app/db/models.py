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
    skill_profile      = relationship("SkillProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


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


class SkillProfile(Base):
    """Created once per CV upload per user. Stores top-level CV analysis."""
    __tablename__ = "skill_profiles"

    id               = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id          = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role             = Column(String)
    seniority        = Column(String)          # entry / junior / mid / senior / staff
    years_experience = Column(Integer)
    cv_score         = Column(Float, nullable=True)
    ats_score        = Column(Float, nullable=True)
    market_insight   = Column(String)
    salary_range     = Column(String)
    created_at       = Column(DateTime, default=_now)
    updated_at       = Column(DateTime, default=_now, onupdate=_now)

    user   = relationship("User", back_populates="skill_profile")
    skills = relationship("TrackedSkill", back_populates="profile", cascade="all, delete-orphan")


class TrackedSkill(Base):
    """One row per skill per user. Every skill is a tracked entity with its own EMA history."""
    __tablename__ = "tracked_skills"

    id             = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id     = Column(String, ForeignKey("skill_profiles.id"), nullable=False, index=True)
    name           = Column(String, nullable=False)        # snake_case: system_design
    display_name   = Column(String)                        # Human: System Design
    category       = Column(String)                        # matched / missing_critical / missing_nice / trending
    source         = Column(String)                        # cv / market / both
    ema_score      = Column(Float, nullable=True)          # None = never tested
    attempts       = Column(Integer, default=0)
    sessions_count = Column(Integer, default=0)
    last_tested_at = Column(DateTime, nullable=True)
    selected       = Column(Boolean, default=False)

    profile = relationship("SkillProfile", back_populates="skills")
    snapshots = relationship("SkillSnapshot", back_populates="skill", cascade="all, delete-orphan")


class SkillSnapshot(Base):
    """Append-only. One row per question answered per skill. Drives evolution charts."""
    __tablename__ = "skill_snapshots"

    id           = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_id     = Column(String, ForeignKey("tracked_skills.id"), nullable=False, index=True)
    session_id   = Column(String, nullable=False)
    score        = Column(Float)            # raw 0-1 from evaluator
    ema_after    = Column(Float)           # EMA value after this answer
    difficulty   = Column(Integer)          # 1-5
    question_text = Column(String)
    answer_text   = Column(String)
    rationale     = Column(String)
    recorded_at  = Column(DateTime, default=_now)

    skill = relationship("TrackedSkill", back_populates="snapshots")
