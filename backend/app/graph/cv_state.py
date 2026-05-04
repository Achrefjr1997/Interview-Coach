from typing import TypedDict, Optional


class CVPipelineState(TypedDict, total=False):
    file_bytes: bytes
    filename: str
    user_id: str

    cv_profile: dict           # role, seniority, years_experience, skills, domains, gaps, ...
    market_data: dict          # in_demand_skills, trending_skills, market_insight, salary_range
    cv_evaluation: dict        # cv_score, ats_score, matched_skills, missing_critical, missing_nice
    interview_config: dict     # role, topics, difficulty, max_questions — feeds POST /sessions

    error: Optional[str]
