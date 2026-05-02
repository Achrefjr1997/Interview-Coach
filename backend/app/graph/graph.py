import sqlite3
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from app.graph.state import InterviewState
from app.graph.edges import should_continue
from app.agents.interviewer import interviewer
from app.agents.evaluator import evaluator
from app.agents.question_gen import question_gen
from app.agents.feedback_agent import feedback_agent
from app.config import settings

_graph = None
_conn = None


def get_graph():
    global _graph, _conn
    if _graph is None:
        _conn = sqlite3.connect(
            settings.coach_checkpointer_db,
            check_same_thread=False,
        )
        saver = SqliteSaver(_conn)

        builder = StateGraph(InterviewState)
        builder.add_node("interviewer", interviewer)
        builder.add_node("evaluator", evaluator)
        builder.add_node("question_gen", question_gen)
        builder.add_node("feedback_agent", feedback_agent)
        builder.set_entry_point("interviewer")
        builder.add_edge("interviewer", "evaluator")
        builder.add_edge("evaluator", "question_gen")
        builder.add_edge("feedback_agent", END)
        builder.add_conditional_edges(
            "question_gen", should_continue,
            {"interviewer": "interviewer", "feedback_agent": "feedback_agent"},
        )
        _graph = builder.compile(checkpointer=saver)
    return _graph


def close_graph():
    global _conn
    if _conn is not None:
        _conn.close()
        _conn = None
