# ── Stage 1: Build React frontend ──────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build
RUN mkdir -p /static && cp -r dist/* /static/

# ── Stage 2: Python backend ─────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app
COPY backend/pyproject.toml .
RUN pip install --no-cache-dir -e .

FROM python:3.12-slim
WORKDIR /app
RUN addgroup --system coach && adduser --system --ingroup coach coach
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /usr/local/bin /usr/local/bin
COPY backend/ .
COPY --from=frontend-builder /static/ ./static/
RUN mkdir -p data && chown -R coach:coach /app
USER coach

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
