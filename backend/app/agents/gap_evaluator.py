import json
import re
from app.llm import chat
from app.graph.cv_state import CVPipelineState


def gap_evaluator(state: CVPipelineState) -> dict:
    cv_profile = state.get("cv_profile")
    market_data = state.get("market_data")

    if not cv_profile:
        return {"error": "No CV profile available for gap evaluation"}

    role = cv_profile.get("role", "Software Engineer")
    seniority = cv_profile.get("seniority", "mid")
    cv_skills = cv_profile.get("skills", [])
    cv_gaps = cv_profile.get("gaps", [])

    in_demand = market_data.get("in_demand_skills", []) if market_data else []
    trending = market_data.get("trending_skills", []) if market_data else []

    prompt = (
        "You are a technical hiring evaluator. Analyze the candidate's CV profile against market demands "
        "and return ONLY valid JSON (no markdown fences).\n\n"
        f"Candidate: {seniority} {role}\n"
        f"CV Skills: {json.dumps(cv_skills)}\n"
        f"Self-reported gaps: {json.dumps(cv_gaps)}\n"
        f"Market in-demand: {json.dumps(in_demand)}\n"
        f"Market trending: {json.dumps(trending)}\n\n"
        "Return this exact schema:\n"
        '{\n'
        '  "cv_score": <0.0-1.0 overall CV quality>,\n'
        '  "ats_score": <0.0-1.0 ATS compatibility score>,\n'
        '  "matched_skills": ["<skill the candidate clearly has>", ...],\n'
        '  "missing_critical": ["<critical skill the candidate lacks for this role>", ...],\n'
        '  "missing_nice": ["<nice-to-have skill the candidate lacks>", ...],\n'
        '  "interview_topics": ["<topic 1>", ...],\n'
        '  "recommended_difficulty": <1-5>,\n'
        '  "cv_summary": "<one sentence summary of the candidate>"\n'
        '}\n\n'
        "Rules:\n"
        "- matched_skills: skills the candidate demonstrably has (max 10).\n"
        "- missing_critical: skills the market demands that the candidate lacks (max 5). These will be tested first.\n"
        "- missing_nice: optional skills that would improve the profile (max 5).\n"
        "- interview_topics: ordered list of max 6 skills to test. Prioritize missing_critical, then gaps, "
        "then trending skills the candidate doesn't have.\n"
        "- recommended_difficulty: 1=entry, 2=junior, 3=mid, 4=senior, 5=staff. Based on seniority.\n"
        "- Use snake_case for skill names.\n"
        "- Ensure every skill in interview_topics appears in exactly ONE of matched_skills, missing_critical, or missing_nice.\n"
    )

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Evaluate this candidate."},
    ]

    raw = re.sub(r"```json|```", "", chat(messages, temperature=0.2)).strip()
    try:
        evaluation = json.loads(raw)
    except json.JSONDecodeError:
        return {"error": f"Failed to parse gap evaluation. LLM response was not valid JSON: {raw[:200]}"}

    # Build interview_config
    topics = evaluation.get("interview_topics", cv_skills[:6])
    difficulty = evaluation.get("recommended_difficulty", 3)

    interview_config = {
        "role": role,
        "topics": topics[:8],
        "max_questions": max(len(topics[:8]) * 2, 10),
        "start_difficulty": max(1, min(5, int(difficulty))),
        "candidate_name": cv_profile.get("candidate_name", "Candidate"),
    }

    # Derive trending_skills to track: skills the market wants but candidate doesn't have
    market_missing = [s for s in trending if s not in cv_skills and s not in evaluation.get("missing_critical", []) and s not in evaluation.get("missing_nice", [])]

    evaluation["trending_skills"] = market_missing[:5]

    return {
        "cv_evaluation": evaluation,
        "interview_config": interview_config,
    }
