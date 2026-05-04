# Interview Coach

A full-stack AI-powered technical interview coaching platform with CV intelligence, adaptive questioning, real-time streaming, skill tracking, and longitudinal analytics.

## Features

- **CV Intelligence Pipeline** — Upload your CV (PDF/DOCX), 3 LangGraph agents parse, scan the job market via Tavily, and evaluate skill gaps. Block-based extraction captures every technical skill (up to 70+ from dense CVs).
- **Skill Registry** — Every skill becomes a tracked entity with EMA history, attempt counts, and evolution snapshots across sessions.
- **Skill Selector UI** — Choose which skills to test from a grouped checklist with inline sparklines and evolution charts.
- **AI-Powered Interviews** — LLM generates role-specific, topic-targeted questions at 5 difficulty levels (Entry to Staff). Question priority uses skill category weights from the registry (critical skills 1.2× priority).
- **Adaptive Difficulty** — Dynamically adjusts question difficulty based on per-skill EMA scores.
- **Real-Time WebSocket Streaming** — Live typewriter-style question delivery with instant scoring feedback.
- **In-Browser Python Sandbox** — Pyodide-based code execution lets candidates test answers before submitting.
- **Comprehensive Reports** — LLM-generated hiring-manager debrief with executive summary, strengths, gaps, and hiring recommendation.
- **Session Replay** — Step-through review of completed interviews with color-coded timeline navigation and historical context.
- **Longitudinal Analytics** — Score trends, topic heatmap, gap clustering, learning velocity, and AI-generated insights across all sessions.
- **AI Practice Recommendations** — Dashboard analyzes past sessions to suggest which topics to practice next.
- **Jupyter-Style UI** — Dark code editor with `In [ ]:` cell labels for a realistic coding interview feel.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  Login │ Register │ Dashboard │ Interview │ Report │ Replay    │
│  CVUpload │ SkillSelector │ Analytics                           │
│                                                                 │
│  Components: Spinner, ScoreRing, Sparkline, SkillEvolutionChart,│
│              CodeRunner (Pyodide), TrendLine, TopicHeatmap, etc.│
└──────────────┬──────────────────────────────┬───────────────────┘
               │ REST API (Axios)             │ WebSocket
               ▼                              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                         │
│                                                                 │
│  Auth │ Sessions │ Interview │ CV │ Skills │ Reports            │
│  Analytics │ Recommendations                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  LangGraph Agents                         │   │
│  │                                                           │   │
│  │  Interview Graph (4 nodes):                               │   │
│  │  interviewer → evaluator → question_gen ──┐              │   │
│  │                                           │              │   │
│  │  feedback_agent ←─────────────────────────┘              │   │
│  │                                                           │   │
│  │  CV Pipeline (3 nodes, runs before interview):            │   │
│  │  cv_parser → market_scanner → gap_evaluator              │   │
│  │                                                           │   │
│  │  Checkpointer: SqliteSaver                                │   │
│  │  Memory: ConversationBufferWindowMemory (k=6)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Skill Tracking: Every answer writes SkillSnapshot + updates    │
│  TrackedSkill EMA. Question gen uses category weights from      │
│  skill registry (missing_critical: 1.2×, matched: 0.8×).       │
│                                                                 │
│  LLM: Ollama (configurable model, e.g. gpt-oss:120b)          │
│  DB: SQLite (async SQLAlchemy + Alembic migrations)            │
│  Search: Tavily (job market scanning)                          │
│  Auth: Server-side sessions, bcrypt, HTTP-only cookies          │
└────────────────────────────────────────────────────────────────┘
```

## LangGraph Agent Flow

### Interview Graph

| Node | Responsibility |
|---|---|
| **interviewer** | Generates one technical question tailored to current topic + difficulty, avoids repeating recent questions |
| **evaluator** | Scores the candidate's answer (0-1), provides rationale, strengths, gaps, and expected answer. Updates per-topic EMA scores (alpha=0.4) |
| **question_gen** | Selects next topic using weighted priority formula: `category_weight * (0.6 * (1 - ema) + 0.4 * (1 / (count + 1)))`. Category weights: missing_critical=1.2, missing_nice=1.0, trending=0.9, matched=0.8. Adjusts difficulty based on score thresholds |
| **feedback_agent** | Generates final hiring-manager debrief report in markdown with hiring recommendation |

**Control Flow:**
```
ENTRY → interviewer → evaluator → question_gen → (turn < max?) → interviewer (loop)
                                                                  │
                                                                  └→ feedback_agent → END
```

The graph uses `interrupt_before=["evaluator"]` to pause execution, allowing the frontend to inject the candidate's answer between the interviewer and evaluator nodes.

### CV Pipeline Graph (pre-interview)

| Node | Responsibility |
|---|---|
| **cv_parser** | Reads PDF/DOCX via pdfplumber/python-docx. Block-based extraction: LLM copies sections verbatim (skills, each job, projects), then extracts skills per block with block-count confidence scoring. Captures up to 70+ skills from dense CVs |
| **market_scanner** | Searches Tavily with 3 queries (in-demand skills, trends, salary). Falls back gracefully if no API key configured |
| **gap_evaluator** | Cross-references CV skills against market demands. Returns cv_score, ats_score, matched_skills, missing_critical, missing_nice, interview_config |

**Control Flow:**
```
cv_parser → market_scanner → gap_evaluator → END
```

No interrupts, no loops — runs straight through and writes SkillProfile + TrackedSkills to DB.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Python 3.12+ |
| **Frontend** | React 18, Vite, React Router v6, recharts |
| **AI/LLM** | LangGraph, LangChain, Ollama |
| **Database** | SQLite, async SQLAlchemy, aiosqlite, Alembic |
| **Auth** | passlib + bcrypt, server-side sessions, HTTP-only cookies (72h TTL) |
| **Search** | Tavily (job market scanning) |
| **CV Parsing** | pdfplumber, python-docx |
| **Real-time** | WebSockets |
| **Code Execution** | Pyodide (in-browser Python 3) |
| **Deployment** | Docker (multi-stage), docker-compose |

## Project Structure

```
interview-coach/
├── docker-compose.yml
├── fly.toml                     # Fly.io deployment config
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini              # Alembic migration config
│   ├── alembic/                 # Migration scripts
│   │   ├── env.py
│   │   └── versions/            # baseline + add_skill_tracking
│   ├── .env.example
│   ├── data/                    # SQLite DB files (runtime)
│   ├── static/                  # Built React frontend (served by FastAPI)
│   └── app/
│       ├── main.py              # FastAPI entry point, CORS, SPA fallback
│       ├── config.py            # Pydantic Settings (env-based config)
│       ├── auth.py              # Password hashing, session management
│       ├── llm.py               # Ollama client (sync, async, streaming)
│       ├── api/
│       │   ├── auth.py          # /register, /login, /logout, /me, /token
│       │   ├── sessions.py      # CRUD sessions, /recommendations, skill weights
│       │   ├── interview.py     # POST /answer, WS /ws/:session_id, skill tracking
│       │   ├── reports.py       # GET /reports/:session_id
│       │   ├── analytics.py     # GET /analytics (trends, gaps, trajectory)
│       │   ├── cv.py            # POST /cv/analyze (file upload → pipeline → DB)
│       │   └── skills.py        # GET /skills/profile, PATCH /skills/select,
│       │                        #   POST /skills/session-config
│       ├── db/
│       │   ├── database.py      # Async SQLAlchemy engine setup
│       │   └── models.py        # User, UserSession, SessionMeta,
│       │                        #   SkillProfile, TrackedSkill, SkillSnapshot
│       ├── agents/
│       │   ├── interviewer.py
│       │   ├── evaluator.py
│       │   ├── question_gen.py  # Category-weighted priority formula
│       │   ├── feedback_agent.py
│       │   ├── memory_store.py
│       │   ├── cv_parser.py     # Block-based extraction (4-step pipeline)
│       │   ├── market_scanner.py    # Tavily search + LLM analysis
│       │   └── gap_evaluator.py     # Cross-reference CV vs market
│       └── graph/
│           ├── state.py         # InterviewState + QuestionRecord TypedDicts
│           ├── edges.py         # should_continue() routing
│           ├── graph.py         # Compiled StateGraph with SqliteSaver
│           ├── cv_state.py      # CVPipelineState TypedDict
│           └── cv_pipeline.py   # CV pipeline graph (3 nodes, linear)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    │   └── assets/logo.jpg
    └── src/
        ├── main.jsx
        ├── App.jsx              # Router (10 routes), AuthContext, RequireAuth
        ├── api.js               # Axios client (16 endpoints)
        ├── useWebSocket.js      # WebSocket hook with auto-reconnect
        ├── cleanMath.js
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx    # Bento grid, CV card, recommendations
        │   ├── Interview.jsx    # Jupyter-style UI + Pyodide sandbox
        │   ├── Report.jsx
        │   ├── Replay.jsx       # Timeline + historical context tab
        │   ├── Analytics.jsx    # Trends/Heatmap/Gaps/Insights tabs
        │   ├── CVUpload.jsx     # Dropzone + 3-step loading + results
        │   └── SkillSelector.jsx    # Grouped skills, checkboxes, sparklines
        └── components/
            ├── Spinner.jsx
            ├── DifficultyBadge.jsx
            ├── ScoreRing.jsx
            ├── SkillBar.jsx
            ├── CodeRunner.jsx
            ├── Sparkline.jsx           # 80×32px inline chart (recharts)
            ├── SkillEvolutionChart.jsx # 480×200px full chart (recharts)
            ├── TrendLine.jsx
            ├── TopicHeatmap.jsx
            ├── GapChart.jsx
            ├── InsightCard.jsx
            └── TrajectoryBadge.jsx
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
| `POST` | `/answer` | REST fallback: submit answer, get next question + skill tracking |
| `WS` | `/ws/:session_id?token=...` | WebSocket: real-time streaming interview + skill tracking |

### CV Intelligence

| Method | Path | Description |
|---|---|---|
| `POST` | `/cv/analyze` | Upload CV (PDF/DOCX) → run 3-agent pipeline → write SkillProfile + TrackedSkills to DB |

### Skills

| Method | Path | Description |
|---|---|---|
| `GET` | `/skills/profile` | Get user's SkillProfile with all TrackedSkills + evolution snapshots |
| `PATCH` | `/skills/select` | Toggle selected skills (body: `{ skill_ids, selected }`) |
| `POST` | `/skills/session-config` | Build interview config from selected skills (ordered by category priority) |

### Reports

| Method | Path | Description |
|---|---|---|
| `GET` | `/reports/:session_id` | Get full report (scores, markdown report, Q&A history) |

### Analytics

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics` | Get longitudinal analytics (trajectory, trends, gaps, difficulty progression) |

## Data Flow — End to End

```
1. Upload CV at /cv → POST /cv/analyze
   → cv_parser extracts 50-70+ skills via block-based extraction
   → market_scanner searches Tavily for trends + salary
   → gap_evaluator cross-references, writes SkillProfile + TrackedSkills

2. Select skills at /skills → GET /skills/profile
   → Choose which skills to test via checkboxes
   → POST /skills/session-config → POST /sessions → navigate to /interview/:id

3. Answer questions at /interview/:id → WebSocket
   → Each answer: evaluator scores it, writes SkillSnapshot, updates EMA
   → question_gen uses category weights for topic priority
   → Skills with higher evidence (block_count ≥ 3) get lower test priority

4. Review progress at /analytics
   → Score trends, heatmap, gap clusters, learning velocity
```

## Scoring System

- **Per-skill scores** use Exponential Moving Average (EMA, alpha=0.4):
  `new_ema = 0.4 * answer_score + 0.6 * previous_ema`
- **Untested skills** (ema_score = null) get highest priority in question selection
- **Overall score** is the mean of all topic scores
- **Difficulty adjustment** based on score thresholds:
  - >= 0.85 → +1 difficulty
  - >= 0.65 → same difficulty
  - >= 0.45 → -1 difficulty
  - < 0.45 → -2 difficulty
- **Topic priority** formula with category weights:
  `weight * (0.6 * (1 - ema) + 0.4 * (1 / (count + 1)))`
  where weight = 1.2 (critical), 1.0 (nice), 0.9 (trending), 0.8 (matched)

## Configuration

| Environment Variable | Description | Default |
|---|---|---|
| `COACH_DATABASE_URL` | SQLite database path | `sqlite+aiosqlite:///./data/coach.db` |
| `COACH_CHECKPOINTER_DB` | LangGraph checkpoint DB path | `./data/checkpoints.db` |
| `OLLAMA_HOST` | Ollama API endpoint | `https://ollama.com` |
| `OLLAMA_API_KEY` | Ollama API key | (required) |
| `OLLAMA_MODEL` | LLM model name | `gpt-oss:120b` |
| `TAVILY_API_KEY` | Tavily search API key | (required for market scanning) |
| `SECRET_KEY` | Session signing key | (required, 64 chars) |
| `SESSION_COOKIE_NAME` | Cookie name | `coach_session` |
| `SESSION_TTL_HOURS` | Session cookie lifetime | `72` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `DEFAULT_MAX_QUESTIONS` | Questions per session | `10` |
| `DEFAULT_START_DIFFICULTY` | Starting difficulty (1-5) | `2` |
| `EMA_ALPHA` | EMA smoothing factor | `0.4` |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Ollama API key (sign up at https://ollama.com)

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
# Edit .env and set OLLAMA_API_KEY, TAVILY_API_KEY

# Run database migrations
alembic upgrade head

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

### Tavily API Key (Optional)

If you skip `TAVILY_API_KEY`, the market scanner falls back to a basic analysis using the candidate's own CV skills without external market data. The CV pipeline still runs and extracts skills.
