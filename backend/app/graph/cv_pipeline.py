from langgraph.graph import StateGraph, END
from app.graph.cv_state import CVPipelineState
from app.agents.cv_parser import cv_parser
from app.agents.market_scanner import market_scanner
from app.agents.gap_evaluator import gap_evaluator


_pipeline = None


def get_cv_pipeline():
    global _pipeline
    if _pipeline is None:
        builder = StateGraph(CVPipelineState)
        builder.add_node("cv_parser", cv_parser)
        builder.add_node("market_scanner", market_scanner)
        builder.add_node("gap_evaluator", gap_evaluator)
        builder.set_entry_point("cv_parser")
        builder.add_edge("cv_parser", "market_scanner")
        builder.add_edge("market_scanner", "gap_evaluator")
        builder.add_edge("gap_evaluator", END)
        _pipeline = builder.compile()
    return _pipeline
