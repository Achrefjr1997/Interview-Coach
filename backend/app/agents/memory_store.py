from langchain_classic.memory import ConversationBufferWindowMemory
import os

WINDOW = int(os.environ.get("MEMORY_WINDOW", 6))
_store: dict[str, ConversationBufferWindowMemory] = {}


def _mem(sid: str) -> ConversationBufferWindowMemory:
    if sid not in _store:
        _store[sid] = ConversationBufferWindowMemory(
            k=WINDOW, return_messages=True, memory_key="chat_history"
        )
    return _store[sid]


def get_context(sid: str) -> list[dict]:
    msgs = _mem(sid).load_memory_variables({}).get("chat_history", [])
    return [{"role": getattr(m, "type", "user"), "content": m.content} for m in msgs]


def save_turn(sid: str, question: str, answer: str) -> None:
    _mem(sid).save_context({"input": question}, {"output": answer})


def clear(sid: str) -> None:
    if sid in _store:
        _store[sid].clear()
        del _store[sid]
