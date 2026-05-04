from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db
from app.db.models import User, SkillProfile, TrackedSkill, SkillSnapshot
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/skills", tags=["skills"])


class SelectRequest(BaseModel):
    skill_ids: list[str]
    selected: bool


CATEGORY_PRIORITY = {
    "missing_critical": 0,
    "missing_nice": 1,
    "trending": 2,
    "matched": 3,
}


@router.get("/profile")
async def get_skill_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SkillProfile)
        .where(SkillProfile.user_id == user.id)
        .options(
            selectinload(SkillProfile.skills).selectinload(TrackedSkill.snapshots)
        )
        .order_by(SkillProfile.created_at.desc())
        .limit(1)
    )
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No CV analysis found. Upload a CV first.")

    skills = []
    for s in profile.skills:
        snapshots = sorted(s.snapshots, key=lambda x: x.recorded_at)
        skills.append({
            "id": s.id,
            "name": s.name,
            "display_name": s.display_name,
            "category": s.category,
            "source": s.source,
            "ema_score": s.ema_score,
            "attempts": s.attempts,
            "sessions_count": s.sessions_count,
            "last_tested_at": s.last_tested_at.isoformat() if s.last_tested_at else None,
            "selected": s.selected,
            "evolution": [
                {
                    "score": snap.score,
                    "ema_after": snap.ema_after,
                    "difficulty": snap.difficulty,
                    "session_id": snap.session_id,
                    "question_text": snap.question_text,
                    "answer_text": snap.answer_text,
                    "rationale": snap.rationale,
                    "recorded_at": snap.recorded_at.isoformat() if snap.recorded_at else None,
                }
                for snap in snapshots
            ],
        })

    return {
        "profile_id": profile.id,
        "role": profile.role,
        "seniority": profile.seniority,
        "cv_score": profile.cv_score,
        "ats_score": profile.ats_score,
        "market_insight": profile.market_insight,
        "salary_range": profile.salary_range,
        "skills": skills,
    }


@router.patch("/select")
async def select_skills(
    req: SelectRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrackedSkill).where(
            TrackedSkill.id.in_(req.skill_ids),
            TrackedSkill.profile.has(SkillProfile.user_id == user.id),
        )
    )
    skills = result.scalars().all()
    if not skills:
        raise HTTPException(status_code=404, detail="No matching skills found")

    for s in skills:
        s.selected = req.selected

    await db.commit()
    return {"updated": len(skills)}


@router.post("/session-config")
async def get_session_config(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrackedSkill)
        .join(SkillProfile)
        .where(SkillProfile.user_id == user.id, TrackedSkill.selected == True)
    )
    skills = result.scalars().all()

    if not skills:
        raise HTTPException(status_code=400, detail="No skills selected. Please select skills to test.")

    # Sort by category priority, then by ema_score ASC NULLS FIRST (untested first)
    skills.sort(key=lambda s: (CATEGORY_PRIORITY.get(s.category, 99), s.ema_score if s.ema_score is not None else -1))

    topics = [s.name for s in skills[:8]]

    # Get role from profile
    profile_result = await db.execute(
        select(SkillProfile).where(SkillProfile.user_id == user.id).limit(1)
    )
    profile = profile_result.scalars().first()
    role = profile.role if profile else "Software Engineer"
    seniority = profile.seniority if profile else "mid"

    seniority_difficulty = {"entry": 1, "junior": 2, "mid": 3, "senior": 4, "staff": 5}
    difficulty = seniority_difficulty.get(seniority, 3)

    return {
        "role": role,
        "topics": topics,
        "max_questions": max(len(topics) * 2, 10),
        "start_difficulty": difficulty,
        "candidate_name": user.name or "Candidate",
    }
