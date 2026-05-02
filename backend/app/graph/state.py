from typing import TypedDict, List, Dict, Optional, Annotated
import operator


class QuestionRecord(TypedDict):
    question:         str
    topic:            str
    difficulty:       int
    candidate_answer: str
    score:            float
    score_rationale:  str
    strengths:        List[str]
    gaps:             List[str]
    expected_answer:  str
    timestamp:        str


class InterviewState(TypedDict):
    session_id:     str
    user_id:        str
    role:           str
    topics:         List[str]
    max_questions:  int
    candidate_name: str

    skill_scores:           Dict[str, float]
    topic_question_counts:  Dict[str, int]
    current_difficulty:     int
    current_topic:          str

    history: Annotated[List[QuestionRecord], operator.add]

    current_question: str
    current_answer:   str
    turn_count:       int

    session_complete: bool
    final_report:     Optional[str]
    overall_score:    Optional[float]
