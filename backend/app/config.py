from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_host:    str   = "https://ollama.com"
    ollama_api_key: str   = ""
    ollama_model:   str   = "gpt-oss:120b"

    coach_database_url:    str = "sqlite+aiosqlite:///./data/coach.db"
    coach_checkpointer_db: str = "./data/checkpoints.db"

    secret_key:           str = "change-this-to-a-random-64-char-string"
    session_cookie_name:  str = "coach_session"
    session_ttl_hours:    int = 72

    cors_origins: str = "http://localhost:5173"
    port:         int = 8000

    default_max_questions:   int   = 10
    default_start_difficulty: int  = 2
    memory_window:           int   = 6
    ema_alpha:               float = 0.4

    class Config:
        env_file = ".env"


settings = Settings()
