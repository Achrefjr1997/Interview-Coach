from app.llm import chat
from app.agents.memory_store import get_context
from app.graph.state import InterviewState


def interviewer(state: InterviewState) -> dict:
    topic   = state["current_topic"]
    diff    = state["current_difficulty"]
    role    = state["role"]
    history = state["history"]
    sid     = state["session_id"]

    recent = [r["question"] for r in history[-4:]]
    avoid  = "\n".join(f"  - {q}" for q in recent) or "  none"

    ctx_msgs = get_context(sid)
    conv = ""
    if ctx_msgs:
        conv = "\n\nRecent exchange:\n" + "\n".join(
            f"{m['role'].upper()}: {m['content']}" for m in ctx_msgs[-4:]
        )

    messages = [
        {
            "role": "system",
            "content": (
                f"You are conducting a live technical interview for a {role}.\n"
                f"Topic: {topic} | Difficulty: {diff}/5 "
                f"(1=entry, 2=junior, 3=mid, 4=senior, 5=staff/principal).\n"
                f"Do NOT repeat these recent questions:\n{avoid}\n"
                f"Ask exactly ONE question. No preamble. Output only the question.{conv}"
            ),
        },
        {"role": "user", "content": f"Ask a difficulty-{diff} {topic} question."},
    ]

    return {"current_question": chat(messages, temperature=0.5).strip()}
