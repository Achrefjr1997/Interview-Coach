from app.graph.state import InterviewState


def should_continue(state: InterviewState) -> str:
    if state["turn_count"] >= state["max_questions"]:
        return "feedback_agent"
    return "interviewer"
