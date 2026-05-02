from app.graph.state import InterviewState


def question_gen(state: InterviewState) -> dict:
    scores = state["skill_scores"]
    counts = state["topic_question_counts"]
    topics = state["topics"]
    diff   = state["current_difficulty"]

    def priority(t: str) -> float:
        return 0.6 * (1.0 - scores.get(t, 0.5)) + 0.4 * (1.0 / (counts.get(t, 0) + 1))

    next_topic  = max(topics, key=priority)
    topic_score = scores.get(next_topic, 0.5)

    if   topic_score >= 0.85: target = min(diff + 1, 5)
    elif topic_score >= 0.65: target = diff
    elif topic_score >= 0.45: target = max(diff - 1, 1)
    else:                     target = max(diff - 2, 1)

    return {
        "current_topic":      next_topic,
        "current_difficulty": max(1, min(5, target)),
    }
