import json
from collections import Counter
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import SessionMeta, User
from app.auth import get_current_user
from app.graph.graph import get_graph

router = APIRouter(prefix="/api/v1", tags=["analytics"])


def _linear_regression(xs: list[float], ys: list[float]) -> float:
    """Return slope of best-fit line. Positive = improving, negative = declining."""
    n = len(xs)
    if n < 2:
        return 0.0
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    den = sum((x - x_mean) ** 2 for x in xs)
    if den == 0:
        return 0.0
    return num / den


def _trend_label(slope: float) -> str:
    if slope > 0.03:
        return "improving"
    if slope < -0.03:
        return "declining"
    return "plateauing"


@router.get("/analytics")
async def get_analytics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate longitudinal insights across all user sessions."""
    result = await db.execute(
        select(SessionMeta)
        .where(SessionMeta.user_id == user.id, SessionMeta.session_complete == True)
        .order_by(SessionMeta.created_at.asc())
    )
    sessions = result.scalars().all()

    if len(sessions) < 1:
        raise HTTPException(status_code=404, detail="No completed sessions yet")

    # Collect per-session data
    topic_trends: dict[str, dict] = {}  # topic -> {"scores": [], "dates": []}
    all_gaps: list[str] = []
    difficulty_progression: list[int] = []
    session_summaries: list[dict] = []
    overall_scores: list[float] = []

    for s in sessions:
        config = {"configurable": {"thread_id": s.session_id}}
        try:
            snap = get_graph().get_state(config)
            if not snap or not snap.values:
                continue
            state = snap.values
            skill_scores = state.get("skill_scores", {})
            history = state.get("history", [])
            overall = state.get("overall_score")
            max_diff = max((r.get("difficulty", 1) for r in history), default=1)

            # Per-topic scores for this session
            for topic, score in skill_scores.items():
                if topic not in topic_trends:
                    topic_trends[topic] = {"scores": [], "dates": []}
                topic_trends[topic]["scores"].append(score)
                topic_trends[topic]["dates"].append(s.created_at.isoformat())

            # Gaps
            for r in history:
                for gap in r.get("gaps", []):
                    all_gaps.append(gap.lower().strip())

            difficulty_progression.append(max_diff)
            if overall is not None:
                overall_scores.append(overall)

            session_summaries.append({
                "session_id": s.session_id,
                "role": s.role,
                "candidate_name": s.candidate_name,
                "overall_score": round(overall, 3) if overall else None,
                "turn_count": s.turn_count,
                "topics": json.loads(s.topics or "[]"),
                "created_at": s.created_at.isoformat(),
            })
        except Exception:
            continue

    if not topic_trends:
        raise HTTPException(status_code=404, detail="No score data available")

    # Compute topic trends with linear regression
    topic_trend_results = []
    for topic, data in topic_trends.items():
        scores = data["scores"]
        xs = list(range(len(scores)))
        slope = _linear_regression(xs, scores)
        latest = scores[-1] if scores else 0
        avg = sum(scores) / len(scores) if scores else 0
        topic_trend_results.append({
            "topic": topic,
            "scores": [round(s, 3) for s in scores],
            "dates": data["dates"],
            "latest": round(latest, 3),
            "avg": round(avg, 3),
            "slope": round(slope, 4),
            "trend": _trend_label(slope),
        })

    # Gap clusters
    gap_counter = Counter(all_gaps)
    total_sessions = len(session_summaries)
    gap_clusters = [
        {"gap": gap, "count": count, "frequency": round(count / total_sessions, 2)}
        for gap, count in gap_counter.most_common(10)
    ]

    # Overall trajectory
    if len(overall_scores) >= 2:
        overall_slope = _linear_regression(list(range(len(overall_scores))), overall_scores)
        trajectory = _trend_label(overall_slope)
    else:
        trajectory = "insufficient_data"

    # Learning velocity (last 3 sessions vs first 3)
    velocity = None
    if len(overall_scores) >= 4:
        mid = len(overall_scores) // 2
        early = sum(overall_scores[:mid]) / mid
        late = sum(overall_scores[mid:]) / (len(overall_scores) - mid)
        if early > 0:
            velocity = round((late - early) / early * 100, 1)

    # Stats
    avg_score = round(sum(overall_scores) / len(overall_scores), 3) if overall_scores else 0
    best_score = round(max(overall_scores), 3) if overall_scores else 0

    return {
        "trajectory": trajectory,
        "stats": {
            "total_sessions": len(session_summaries),
            "avg_score": avg_score,
            "best_score": best_score,
            "velocity": velocity,
        },
        "topic_trends": topic_trend_results,
        "gap_clusters": gap_clusters,
        "difficulty_progression": difficulty_progression,
        "sessions": session_summaries,
    }
