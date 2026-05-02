from app.config import settings
from ollama import Client, AsyncClient

_client = None
_async_client = None


def _get_client():
    global _client
    if _client is None:
        _client = Client(
            host=settings.ollama_host,
            headers={"Authorization": f"Bearer {settings.ollama_api_key}"},
        )
    return _client


def _get_async_client():
    global _async_client
    if _async_client is None:
        _async_client = AsyncClient(
            host=settings.ollama_host,
            headers={"Authorization": f"Bearer {settings.ollama_api_key}"},
        )
    return _async_client


MODEL = settings.ollama_model


def chat(messages: list[dict], temperature: float = 0.3) -> str:
    resp = _get_client().chat(model=MODEL, messages=messages, options={"temperature": temperature})
    return resp["message"]["content"]


async def chat_async(messages: list[dict], temperature: float = 0.3) -> str:
    resp = await _get_async_client().chat(model=MODEL, messages=messages, options={"temperature": temperature})
    return resp["message"]["content"]


async def chat_stream(messages: list[dict], temperature: float = 0.3):
    """Async generator — yields text chunks for WebSocket streaming."""
    async for part in await _get_async_client().chat(
        model=MODEL, messages=messages,
        options={"temperature": temperature}, stream=True,
    ):
        chunk = part["message"]["content"]
        if chunk:
            yield chunk
