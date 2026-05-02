import json
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db, AsyncSessionLocal
from app.db.models import SessionMeta, UserSession, User
from app.auth import get_current_user
from app.graph.graph import get_graph
from app.llm import chat_stream

router = APIRouter(tags=["interview"])


class AnswerRequest(BaseModel):
    session_id: str
    answer:     str


class AnswerResponse(BaseModel):
    turn:                int
    question_just_asked: str
    score:               float
    skill_scores:        dict
    next_question:       str | None
    next_topic:          str
    next_difficulty:     int
    session_complete:    bool
    expected_answer:     str = ""


@router.post("/api/v1/answer", response_model=AnswerResponse)
async def submit_answer(
    req: AnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.get(SessionMeta, req.session_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    config = {"configurable": {"thread_id": req.session_id}}
    graph  = get_graph()

    snap = graph.get_state(config)
    if not snap or not snap.values:
        raise HTTPException(status_code=404, detail="Session state not found")
    if snap.values.get("session_complete"):
        raise HTTPException(status_code=400, detail="Session already complete")

    graph.update_state(config, {"current_answer": req.answer})
    result = graph.invoke(None, config=config, interrupt_before=["evaluator"])

    if result.get("session_complete"):
        row.session_complete = True
        row.overall_score    = result.get("overall_score")
        row.turn_count       = result.get("turn_count", 0)
        await db.commit()

    last = result["history"][-1] if result["history"] else {}

    return AnswerResponse(
        turn=result["turn_count"],
        question_just_asked=last.get("question", ""),
        score=last.get("score", 0.0),
        skill_scores=result["skill_scores"],
        next_question=result.get("current_question") if not result["session_complete"] else None,
        next_topic=result["current_topic"],
        next_difficulty=result["current_difficulty"],
        session_complete=result["session_complete"],
        expected_answer=last.get("expected_answer", ""),
    )


async def _get_ws_user(token: str) -> User | None:
    """Validate session token for WebSocket connections."""
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(UserSession).where(
                UserSession.token == token,
                UserSession.expires_at > now,
            )
        )
        user_session = result.scalar_one_or_none()
        if not user_session:
            return None
        result2 = await db.execute(select(User).where(User.id == user_session.user_id))
        return result2.scalar_one_or_none()


@router.websocket("/ws/{session_id}")
async def interview_ws(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    user = await _get_ws_user(token)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    graph  = get_graph()
    config = {"configurable": {"thread_id": session_id}}

    try:
        while True:
            data = await websocket.receive_text()
            msg  = json.loads(data)

            if msg.get("type") != "answer":
                continue

            answer = msg["content"].strip()
            if not answer:
                continue

            snap = graph.get_state(config)
            if not snap or not snap.values:
                await websocket.send_json({"type": "error", "content": "Session not found"})
                break
            if snap.values.get("session_complete"):
                await websocket.send_json({"type": "error", "content": "Session already complete"})
                break

            graph.update_state(config, {"current_answer": answer})
            result = graph.invoke(None, config=config, interrupt_before=["evaluator"])
            last   = result["history"][-1] if result["history"] else {}

            if result["session_complete"]:
                async with AsyncSessionLocal() as db:
                    row = await db.get(SessionMeta, session_id)
                    if row:
                        row.session_complete = True
                        row.overall_score    = result.get("overall_score")
                        row.turn_count       = result.get("turn_count", 0)
                        await db.commit()

                report_msgs = [
                    {"role": "user", "content": f"Here is the session report:\n{result['final_report']}"}
                ]
                async for chunk in chat_stream(report_msgs, temperature=0.1):
                    await websocket.send_json({"type": "report_chunk", "content": chunk})

                await websocket.send_json({
                    "type":          "session_complete",
                    "overall_score": result.get("overall_score"),
                    "skill_scores":  result["skill_scores"],
                })
                break

            next_q = result.get("current_question", "")
            if next_q:
                await websocket.send_json({"type": "question_chunk", "content": next_q})

            await websocket.send_json({
                "type": "question_done",
                "meta": {
                    "score":            last.get("score", 0.0),
                    "rationale":        last.get("score_rationale", ""),
                    "skill_scores":     result["skill_scores"],
                    "next_topic":       result["current_topic"],
                    "next_difficulty":  result["current_difficulty"],
                    "turn":             result["turn_count"],
                    "expected_answer":  last.get("expected_answer", ""),
                },
            })

    except WebSocketDisconnect:
        pass
