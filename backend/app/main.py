from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from app.api import auth, sessions, interview, reports
from app.db.database import init_db
from app.config import settings
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    from app.graph.graph import get_graph, close_graph
    get_graph()
    yield
    close_graph()


app = FastAPI(title="Interview Coach API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(interview.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}


# Serve React frontend (built into backend/static/)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        """Return index.html for all non-API routes so React Router works."""
        return FileResponse(os.path.join(static_dir, "index.html"))
