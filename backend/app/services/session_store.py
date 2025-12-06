"""In-memory session store for conversation history."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
import uuid
import asyncio


@dataclass
class ConversationSession:
    """A single conversation session with message history."""

    messages: list[dict[str, str]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: datetime = field(default_factory=datetime.now)


class SessionStore:
    """Async-safe in-memory session store.

    Uses asyncio.Lock for coroutine safety within a single process.
    For multi-process deployments (e.g., gunicorn with multiple workers),
    swap this for Redis by implementing the same interface.
    """

    def __init__(self, ttl_minutes: int = 60):
        self._sessions: dict[str, ConversationSession] = {}
        self._lock = asyncio.Lock()
        self._ttl = timedelta(minutes=ttl_minutes)

    async def get_or_create(self, session_id: str | None) -> tuple[str, list[dict]]:
        """Get existing session or create new one.

        Args:
            session_id: Existing session ID, or None to create new

        Returns:
            Tuple of (session_id, history_copy)
        """
        async with self._lock:
            if session_id and session_id in self._sessions:
                session = self._sessions[session_id]
                session.last_accessed = datetime.now()
                return session_id, session.messages.copy()

            new_id = str(uuid.uuid4())
            self._sessions[new_id] = ConversationSession()
            return new_id, []

    async def add_message(self, session_id: str, role: str, content: str) -> None:
        """Add a message to session history.

        Args:
            session_id: The session to add to
            role: "user" or "assistant"
            content: Message content
        """
        async with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id].messages.append({
                    "role": role,
                    "content": content
                })
                self._sessions[session_id].last_accessed = datetime.now()

    async def cleanup_expired(self) -> int:
        """Remove expired sessions.

        Returns:
            Number of sessions removed
        """
        async with self._lock:
            now = datetime.now()
            expired = [
                sid for sid, session in self._sessions.items()
                if now - session.last_accessed > self._ttl
            ]
            for sid in expired:
                del self._sessions[sid]
            return len(expired)

    async def get_session_count(self) -> int:
        """Get current number of active sessions."""
        async with self._lock:
            return len(self._sessions)


# Global instance
session_store = SessionStore()
