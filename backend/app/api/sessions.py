import uuid, json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import SessionMeta, User
from app.auth import get_current_user
from app.graph.graph import get_graph
from app.graph.state import InterviewState

router = APIRouter(prefix="/api/v1", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    role:             str       = "Senior Python Engineer"
    topics:           list[str] = ["algorithms", "system_design", "python"]
    max_questions:    int       = 10
    candidate_name:   str       = "Candidate"
    start_difficulty: int       = 2


class SessionResponse(BaseModel):
    session_id:     str
    role:           str
    topics:         list[str]
    first_question: str


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    req: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sid = str(uuid.uuid4())

    initial: InterviewState = {
        "session_id":            sid,
        "user_id":               user.id,
        "role":                  req.role,
        "topics":                req.topics,
        "max_questions":         req.max_questions,
        "candidate_name":        req.candidate_name,
        "skill_scores":          {},
        "topic_question_counts": {},
        "current_difficulty":    req.start_difficulty,
        "current_topic":         req.topics[0],
        "history":               [],
        "current_question":      "",
        "current_answer":        "",
        "turn_count":            0,
        "session_complete":      False,
        "final_report":          None,
        "overall_score":         None,
    }

    config = {"configurable": {"thread_id": sid}}
    result = get_graph().invoke(initial, config=config, interrupt_before=["evaluator"])

    db.add(SessionMeta(
        session_id=sid,
        user_id=user.id,
        candidate_name=req.candidate_name,
        role=req.role,
        topics=json.dumps(req.topics),
    ))
    await db.commit()

    return SessionResponse(
        session_id=sid,
        role=req.role,
        topics=req.topics,
        first_question=result["current_question"],
    )


@router.get("/sessions")
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SessionMeta)
        .where(SessionMeta.user_id == user.id)
        .order_by(SessionMeta.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "session_id":       r.session_id,
            "role":             r.role,
            "topics":           json.loads(r.topics or "[]"),
            "overall_score":    r.overall_score,
            "session_complete": r.session_complete,
            "created_at":       r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(SessionMeta, session_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    config = {"configurable": {"thread_id": session_id}}
    state  = get_graph().get_state(config)
    if not state or not state.values:
        raise HTTPException(status_code=404, detail="Session state not found")

    s = state.values
    return {
        "session_id":         session_id,
        "turn_count":         s.get("turn_count", 0),
        "skill_scores":       s.get("skill_scores", {}),
        "current_topic":      s.get("current_topic", ""),
        "current_difficulty": s.get("current_difficulty", 2),
        "session_complete":   s.get("session_complete", False),
        "current_question":   s.get("current_question", ""),
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(SessionMeta, session_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    from app.agents.memory_store import clear
    clear(session_id)

    await db.delete(row)
    await db.commit()

    return {"ok": True}
