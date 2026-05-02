from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import SessionMeta, User
from app.auth import get_current_user
from app.graph.graph import get_graph

router = APIRouter(prefix="/api/v1", tags=["reports"])


@router.get("/reports/{session_id}")
async def get_report(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(SessionMeta, session_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    if not row.session_complete:
        raise HTTPException(status_code=400, detail="Session not yet complete")

    config = {"configurable": {"thread_id": session_id}}
    snap   = get_graph().get_state(config)
    if not snap or not snap.values:
        raise HTTPException(status_code=404, detail="Session state not found")

    s = snap.values
    return {
        "session_id":      session_id,
        "candidate_name":  s.get("candidate_name"),
        "role":            s.get("role"),
        "overall_score":   s.get("overall_score"),
        "skill_scores":    s.get("skill_scores"),
        "final_report":    s.get("final_report"),
        "total_questions": s.get("turn_count"),
        "history":         s.get("history", []),
    }
