# Interview Coach

A full-stack AI-powered technical interview coaching platform that simulates real technical interviews with adaptive difficulty, real-time streaming, and comprehensive post-interview reports.

## Features

- **AI-Powered Interviews** — LLM generates role-specific, topic-targeted questions at 5 difficulty levels (Entry to Staff)
- **Adaptive Difficulty** — Dynamically adjusts question difficulty based on per-topic EMA scores
- **Smart Topic Selection** — Prioritizes weakest and least-practiced topics using a weighted priority algorithm
- **Real-Time WebSocket Streaming** — Live typewriter-style question delivery with instant scoring feedback
- **In-Browser Python Sandbox** — Pyodide-based code execution lets candidates test answers before submitting
- **Comprehensive Reports** — LLM-generated hiring-manager debrief with executive summary, strengths, gaps, and hiring recommendation
- **Session Replay** — Step-through review of completed interviews with color-coded timeline navigation
- **AI Practice Recommendations** — Dashboard analyzes past sessions to suggest which topics to practice next
- **Jupyter-Style UI** — Dark code editor with `In [ ]:` cell labels for a realistic coding interview feel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  Login │ Register │ Dashboard │ Interview │ Report │ Replay  │
│                                                              │
│  Components: Spinner, DifficultyBadge, ScoreRing,            │
│              SkillBar, CodeRunner (Pyodide)                  │
└──────────────┬──────────────────────────────┬────────────────┘
               │ REST API (Axios)             │ WebSocket
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                      │
│                                                              │
│  Auth │ Sessions │ Interview │ Reports │ Recommendations    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  LangGraph Agent                      │   │
│  │                                                       │   │
│  │  interviewer → evaluator → question_gen ──┐          │   │
│  │                                            │          │   │
│  │  feedback_agent ←──────────────────────────┘          │   │
│  │                                                       │   │
│  │  Checkpointer: SqliteSaver                            │   │
│  │  Memory: ConversationBufferWindowMemory (k=6)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  LLM: Ollama (configurable model)                           │
│  DB: SQLite (async SQLAlchemy)                              │
│  Auth: Server-side sessions, bcrypt, HTTP-only cookies      │
└─────────────────────────────────────────────────────────────┘
```

## LangGraph Agent Flow

| Node | Responsibility |
|---|---|
| **interviewer** | Generates one technical question tailored to current topic + difficulty, avoids repeating recent questions |
| **evaluator** | Scores the candidate's answer (0-1), provides rationale, strengths, gaps, and expected answer. Updates per-topic EMA scores (alpha=0.4) |
| **question_gen** | Selects next topic using priority formula: `0.6 * (1 - score) + 0.4 * (1 / (count + 1))`. Adjusts difficulty based on score thresholds |
| **feedback_agent** | Generates final hiring-manager debrief report in markdown with hiring recommendation |

**Control Flow:**
```
ENTRY → interviewer → evaluator → question_gen → (turn < max?) → interviewer (loop)
                                                                  │
                                                                  └→ feedback_agent → END
```

The graph uses `interrupt_before=["evaluator"]` to pause execution, allowing the frontend to inject the candidate's answer between the interviewer and evaluator nodes.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Python 3.12+ |
| **Frontend** | React 18, Vite, React Router v6 |
| **AI/LLM** | LangGraph, LangChain, Ollama |
| **Database** | SQLite, async SQLAlchemy, aiosqlite |
| **Auth** | passlib + bcrypt, server-side sessions, HTTP-only cookies (72h TTL) |
| **Real-time** | WebSockets |
| **Code Execution** | Pyodide (in-browser Python 3) |
| **Deployment** | Docker (multi-stage), docker-compose |

## Project Structure

```
interview-coach/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── .env.example
│   ├── static/               # Built React frontend (served by FastAPI)
│   └── app/
│       ├── main.py           # FastAPI entry point, CORS, SPA fallback
│       ├── config.py         # Pydantic Settings (env-based config)
│       ├── auth.py           # Password hashing, session management
│       ├── llm.py            # Ollama client (sync, async, streaming)
│       ├── api/
│       │   ├── auth.py       # /register, /login, /logout, /me, /token
│       │   ├── sessions.py   # CRUD sessions, /recommendations
│       │   ├── interview.py  # POST /answer, WS /ws/:session_id
│       │   └── reports.py    # GET /reports/:session_id
│       ├── db/
│       │   ├── database.py   # Async SQLAlchemy engine setup
│       │   └── models.py     # User, UserSession, SessionMeta ORM models
│       ├── agents/
│       │   ├── interviewer.py
│       │   ├── evaluator.py
│       │   ├── question_gen.py
│       │   ├── feedback_agent.py
│       │   └── memory_store.py
│       └── graph/
│           ├── state.py      # InterviewState TypedDict
│           ├── edges.py      # should_continue() routing
│           └── graph.py      # Compiled StateGraph with SqliteSaver
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx           # Router, AuthContext, RequireAuth guard
        ├── api.js            # Axios client (all REST endpoints)
        ├── useWebSocket.js   # WebSocket hook with auto-reconnect
        ├── cleanMath.js      # Strips LaTeX delimiters from LLM output
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── Interview.jsx
        │   ├── Report.jsx
        │   └── Replay.jsx
        └── components/
            ├── Spinner.jsx
            ├── DifficultyBadge.jsx
            ├── ScoreRing.jsx
            ├── SkillBar.jsx
            └── CodeRunner.jsx
```

## API Endpoints

### Auth (`/api/v1/auth`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Register new user |
| `POST` | `/login` | Login with email/password |
| `POST` | `/logout` | Delete session cookie |
| `GET` | `/me` | Get current user info |
| `GET` | `/token` | Get raw session token for WebSocket auth |

### Sessions (`/api/v1`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/sessions` | Create new interview session, returns first question |
| `GET` | `/sessions` | List all sessions for current user |
| `GET` | `/sessions/:id` | Get session state (turn count, scores, current question) |
| `DELETE` | `/sessions/:id` | Delete session and clear memory |
| `GET` | `/recommendations` | Get AI-powered topic recommendations based on past performance |

### Interview

| Method | Path | Description |
|---|---|---|
| `POST` | `/answer` | REST fallback: submit answer, get next question |
| `WS` | `/ws/:session_id?token=...` | WebSocket: real-time streaming interview |

### Reports

| Method | Path | Description |
|---|---|---|
| `GET` | `/reports/:session_id` | Get full report (scores, markdown report, Q&A history) |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Ollama running with a supported model (default: `gpt-oss:120b`)

### Backend Setup

```bash
cd backend

# Create virtual environment
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env and set your OLLAMA_API_KEY and OLLAMA_BASE_URL

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server (proxies API to localhost:8000)
npm run dev

# Build for production (outputs to ../backend/static/)
npm run build
```

### Docker

```bash
docker-compose up --build
```

## Scoring System

- **Per-topic scores** use Exponential Moving Average (EMA, alpha=0.4):
  `new_score = 0.4 * answer_score + 0.6 * previous_score`
- **Overall score** is the mean of all topic scores
- **Difficulty adjustment** based on score thresholds:
  - >= 0.85 → +1 difficulty
  - >= 0.65 → same difficulty
  - >= 0.45 → -1 difficulty
  - < 0.45 → -2 difficulty
- **Topic priority** formula: `0.6 * weakness + 0.4 * under-practice`

## Configuration

| Environment Variable | Description | Default |
|---|---|---|
| `COACH_DATABASE_URL` | SQLite database path | `sqlite+aiosqlite:///./data/coach.db` |
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_API_KEY` | Ollama API key | (required) |
| `OLLAMA_MODEL` | LLM model name | `gpt-oss:120b` |
| `SESSION_TTL_HOURS` | Session cookie lifetime | `72` |
| `SECRET_KEY` | Session signing key | (auto-generated) |