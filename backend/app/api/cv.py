import json
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import User, SkillProfile, TrackedSkill
from app.auth import get_current_user
from app.graph.cv_pipeline import get_cv_pipeline
from app.graph.cv_state import CVPipelineState

router = APIRouter(prefix="/api/v1/cv", tags=["cv"])

CATEGORY_SOURCE_MAP = {
    "matched": "cv",
    "missing_critical": "both",
    "missing_nice": "cv",
    "trending": "market",
}

DISPLAY_NAMES = {
    "system_design": "System Design",
    "data_structures": "Data Structures",
    "algorithms": "Algorithms",
    "machine_learning": "Machine Learning",
    "deep_learning": "Deep Learning",
    "python": "Python",
    "sql": "SQL",
    "aws": "AWS",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "ci_cd": "CI/CD",
    "git": "Git",
    "rest_api": "REST API",
    "graphql": "GraphQL",
    "microservices": "Microservices",
    "react": "React",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "go": "Go",
    "rust": "Rust",
    "java": "Java",
    "c_plus_plus": "C++",
    "terraform": "Terraform",
    "linux": "Linux",
    "networking": "Networking",
    "security": "Security",
    "testing": "Testing",
    "agile": "Agile",
    "devops": "DevOps",
    "distributed_systems": "Distributed Systems",
}


def _display_name(skill_name: str, skill_details: dict = None) -> str:
    if skill_details and skill_name in skill_details:
        return skill_details[skill_name].get("display_name", skill_name.replace("_", " ").title())
    return DISPLAY_NAMES.get(skill_name, skill_name.replace("_", " ").title())


def _get_category_for_skill(skill: str, evaluation: dict) -> str:
    if skill in evaluation.get("matched_skills", []):
        return "matched"
    if skill in evaluation.get("missing_critical", []):
        return "missing_critical"
    if skill in evaluation.get("missing_nice", []):
        return "missing_nice"
    if skill in evaluation.get("trending_skills", []):
        return "trending"
    return "matched"


@router.post("/analyze")
async def analyze_cv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filename = file.filename or "cv.pdf"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are accepted")

    file_bytes = await file.read()

    state: CVPipelineState = {
        "file_bytes": file_bytes,
        "filename": filename,
        "user_id": user.id,
    }

    pipeline = get_cv_pipeline()
    result = pipeline.invoke(state)

    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    cv_profile = result.get("cv_profile", {})
    market_data = result.get("market_data", {})
    evaluation = result.get("cv_evaluation", {})
    interview_config = result.get("interview_config", {})

    # Write SkillProfile + TrackedSkills to DB
    # Delete old profile if exists
    from sqlalchemy import select, delete
    existing = (await db.execute(select(SkillProfile).where(SkillProfile.user_id == user.id))).scalars().first()
    if existing:
        await db.delete(existing)
        await db.flush()

    profile = SkillProfile(
        user_id=user.id,
        role=evaluation.get("role", cv_profile.get("role", "")),
        seniority=cv_profile.get("seniority", "mid"),
        years_experience=cv_profile.get("years_experience", 0),
        cv_score=evaluation.get("cv_score"),
        ats_score=evaluation.get("ats_score"),
        market_insight=market_data.get("market_insight", ""),
        salary_range=market_data.get("salary_range", ""),
    )
    db.add(profile)
    await db.flush()

    # Build skill details lookup from cv_profile
    skill_lookup = {}
    for sd in cv_profile.get("skill_details", []):
        skill_lookup[sd["canonical_name"]] = sd

    # Start with ALL extracted skills as "matched" by default
    all_skills = set(cv_profile.get("skills", []))

    # Then override specific skills with evaluator's classification
    for cat in ("missing_critical", "missing_nice", "trending"):
        for skill in evaluation.get(f"{cat}_skills" if cat != "trending" else "trending_skills", []):
            all_skills.add(skill)
    # Also add skills from cv_profile.gaps
    for gap in cv_profile.get("gaps", []):
        all_skills.add(gap)

    for skill_name in all_skills:
        category = _get_category_for_skill(skill_name, evaluation)
        source = CATEGORY_SOURCE_MAP.get(category, "cv")
        selected = category == "missing_critical"
        tracked = TrackedSkill(
            profile_id=profile.id,
            name=skill_name,
            display_name=_display_name(skill_name, skill_lookup),
            category=category,
            source=source,
            selected=selected,
        )
        db.add(tracked)

    await db.commit()

    return {
        "skill_profile_id": profile.id,
        "cv_profile": cv_profile,
        "market_data": market_data,
        "cv_evaluation": evaluation,
        "interview_config": interview_config,
    }
