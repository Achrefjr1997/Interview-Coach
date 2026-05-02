import json, re
from datetime import datetime, timezone
from app.llm import chat
from app.agents.memory_store import save_turn
from app.graph.state import InterviewState, QuestionRecord

EMA_ALPHA = float(__import__("os").environ.get("EMA_ALPHA", "0.4"))


def evaluator(state: InterviewState) -> dict:
    q    = state["current_question"]
    ans  = state["current_answer"]
    top  = state["current_topic"]
    diff = state["current_difficulty"]
    sid  = state["session_id"]

    messages = [
        {
            "role": "system",
            "content": (
                f"Evaluate this technical interview answer. Role: {state['role']}. "
                f"Topic: {top}. Difficulty: {diff}/5.\n"
                "Return ONLY valid JSON — no markdown fences:\n"
                '{"score":<0.0-1.0>,"rationale":"<1 sentence assessing correctness>",'
                '"strengths":["..."],"gaps":["..."],'
                '"expected_answer":"<THE ACTUAL CORRECT SOLUTION>"}\n\n'
                "CRITICAL RULES for expected_answer:\n"
                "- If the question asks to 'write a function' or 'write code', "
                "you MUST output the exact correct Python code (complete function).\n"
                "- If the question asks about 'design' or 'explain', output the design/explanation.\n"
                "- NEVER output a prose description when code was requested.\n"
                "- Escaped newlines are fine. Keep it concise and correct."
            ),
        },
        {"role": "user", "content": f"Question: {q}\nAnswer: {ans}"},
    ]

    raw = re.sub(r"```json|```", "", chat(messages, temperature=0.1)).strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r'"score"\s*:\s*([\d.]+)', raw)
        data = {
            "score": float(m.group(1)) if m else 0.5,
            "rationale": "Parse error — approximate score used.",
            "strengths": [],
            "gaps": ["Evaluation could not be fully parsed."],
            "expected_answer": "Unable to generate expected answer due to parse error.",
        }

    score = max(0.0, min(1.0, float(data["score"])))

    scores = dict(state["skill_scores"])
    scores[top] = round(EMA_ALPHA * score + (1 - EMA_ALPHA) * scores.get(top, 0.5), 4)

    counts = dict(state["topic_question_counts"])
    counts[top] = counts.get(top, 0) + 1

    record: QuestionRecord = {
        "question":         q,
        "topic":            top,
        "difficulty":       diff,
        "candidate_answer": ans,
        "score":            score,
        "score_rationale":  data.get("rationale", ""),
        "strengths":        data.get("strengths", []),
        "gaps":             data.get("gaps", []),
        "expected_answer":  data.get("expected_answer", ""),
        "timestamp":        datetime.now(timezone.utc).isoformat(),
    }

    save_turn(sid, question=q, answer=ans)

    return {
        "skill_scores":          scores,
        "topic_question_counts": counts,
        "history":               [record],
        "turn_count":            state["turn_count"] + 1,
    }
