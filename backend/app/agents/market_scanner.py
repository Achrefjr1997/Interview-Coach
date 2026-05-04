import json
import re
from app.llm import chat
from app.graph.cv_state import CVPipelineState
from app.config import settings


def market_scanner(state: CVPipelineState) -> dict:
    cv_profile = state.get("cv_profile")
    if not cv_profile:
        return {"error": "No CV profile available for market scan"}

    api_key = settings.tavily_api_key
    if not api_key or api_key.startswith("tvly-your"):
        return {
            "market_data": {
                "in_demand_skills": cv_profile.get("skills", [])[:10],
                "trending_skills": [],
                "market_insight": "Market scan skipped (no Tavily API key configured).",
                "salary_range": "Not available",
            }
        }

    role = cv_profile.get("role", "Software Engineer")
    seniority = cv_profile.get("seniority", "mid")
    skills = cv_profile.get("skills", [])

    queries = [
        f"in-demand technical skills for {seniority} {role} 2024 2025",
        f"hiring trends {role} skills market demand 2025",
        f"average salary range {seniority} {role} 2025",
    ]

    snippets = []
    for q in queries:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=api_key)
            results = client.search(q, max_results=6, search_depth="basic")
            for r in results.get("results", []):
                snippets.append(r.get("content", "")[:300])
        except Exception:
            continue

    combined = "\n---\n".join(snippets[:12]) if snippets else "(No market data retrieved)"

    prompt = (
        "You are a job market analyst. Based on the search results below, return ONLY valid JSON "
        "(no markdown fences).\n\n"
        "Return this exact schema:\n"
        '{\n'
        '  "in_demand_skills": ["<skill 1>", "<skill 2>", ...],\n'
        '  "trending_skills": ["<trending skill 1>", ...],\n'
        '  "market_insight": "<2-3 sentence summary of current market conditions>",\n'
        '  "salary_range": "<estimated salary range for the role>"\n'
        '}\n\n'
        "Rules:\n"
        "- List at most 10 in-demand skills and 5 trending skills.\n"
        "- Use snake_case for skill names.\n"
        "- Keep market_insight concise and data-driven.\n"
    )

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": f"Candidate: {seniority} {role}\nSkills: {', '.join(skills[:10])}\n\nMarket search results:\n{combined}"},
    ]

    raw = re.sub(r"```json|```", "", chat(messages, temperature=0.2)).strip()
    try:
        market_data = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "market_data": {
                "in_demand_skills": skills[:10],
                "trending_skills": [],
                "market_insight": "Unable to analyze market data.",
                "salary_range": "Not available",
            }
        }

    return {"market_data": market_data}
