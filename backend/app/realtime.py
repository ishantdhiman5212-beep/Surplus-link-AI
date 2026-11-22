"""In-process pub/sub used by rescue-session and global donation WebSockets."""

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from app.schemas import StreamEventOut

CHANNEL_GLOBAL = "global_donations"
CHANNEL_PREFIX = "rescue_session_"


def session_channel(rescue_session_id: int) -> str:
    """Return the channel name for one rescue session."""
    return f"{CHANNEL_PREFIX}{rescue_session_id}"


class EventHub:
    """Fan-out hub with a bounded queue per subscriber."""

    def __init__(self, queue_size: int = 100) -> None:
        self._queue_size = queue_size
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}

    def add_subscriber(self, channel: str) -> asyncio.Queue[dict[str, Any]]:
        """Register a new subscriber queue for a channel."""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=self._queue_size)
        self._subscribers.setdefault(channel, set()).add(queue)
        return queue

    def remove_subscriber(
        self,
        channel: str,
        queue: asyncio.Queue[dict[str, Any]],
    ) -> None:
        """Remove a subscriber queue and clean up empty channels."""
        subscribers = self._subscribers.get(channel)
        if subscribers is None:
            return
        subscribers.discard(queue)
        if not subscribers:
            self._subscribers.pop(channel, None)

    async def publish(self, channel: str, event: StreamEventOut) -> None:
        """Publish an event to every subscriber of a channel."""
        payload = event.model_dump(mode="json")
        for queue in list(self._subscribers.get(channel, set())):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            queue.put_nowait(payload)

    async def subscribe(self, channel: str) -> AsyncIterator[dict[str, Any]]:
        """Yield events published on a channel until the client disconnects."""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=self._queue_size)
        self._subscribers.setdefault(channel, set()).add(queue)
        try:
            while True:
                try:
                    yield await queue.get()
                except asyncio.CancelledError:
                    raise
        finally:
            subscribers = self._subscribers.get(channel)
            if subscribers is not None:
                subscribers.discard(queue)
                if not subscribers:
                    self._subscribers.pop(channel, None)


hub = EventHub()
