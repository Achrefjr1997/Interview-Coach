from app.llm import chat
from app.graph.state import InterviewState


def feedback_agent(state: InterviewState) -> dict:
    history = state["history"]
    scores  = state["skill_scores"]
    role    = state["role"]
    name    = state["candidate_name"]

    if not scores:
        return {
            "final_report": "Session ended with no answers.",
            "overall_score": 0.0,
            "session_complete": True,
        }

    overall = round(sum(scores.values()) / len(scores), 3)

    breakdown = []
    for topic, score in sorted(scores.items(), key=lambda x: x[1]):
        recs = [r for r in history if r["topic"] == topic]
        lines = []
        for i, r in enumerate(recs):
            lines.append(
                f"- **Q{i+1}** (diff {r['difficulty']}/5) — Score: {r['score']:.0%}\n"
                f"  - Question: {r['question']}\n"
                f"  - Candidate answer: {r['candidate_answer'][:200]}\n"
                f"  - Rationale: {r['score_rationale']}\n"
                f"  - Expected answer: {r.get('expected_answer', 'N/A')[:300]}"
            )
        breakdown.append(
            f"### {topic.replace('_',' ').title()} — {score:.0%}\n\n"
            + "\n\n".join(lines)
        )

    messages = [
        {
            "role": "system",
            "content": (
                "Write a final technical interview debrief report for a hiring manager.\n"
                "Be direct and specific. Reference actual scores and topics.\n"
                "Use these exact markdown sections (do NOT use HTML tables, only markdown):\n"
                "## Executive Summary\n"
                "## Strengths\n"
                "## Areas to Improve\n"
                "## Hiring Recommendation\n\n"
                "Hiring recommendation must be exactly one of: "
                "'Strong Yes' / 'Yes' / 'Borderline' / 'No'\n"
                "Then provide a concise 1-2 sentence rationale.\n"
                "Keep the report concise — the detailed breakdown is handled separately.\n"
                "Do NOT include HTML tags or HTML tables."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Candidate: {name}\n"
                f"Role: {role}\n"
                f"Questions answered: {len(history)}\n"
                f"Overall: {overall:.0%}\n\n"
                + "\n\n".join(breakdown)
            ),
        },
    ]

    return {
        "final_report": chat(messages, temperature=0.2),
        "overall_score": overall,
        "session_complete": True,
    }
