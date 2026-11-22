"""WebSocket streams for live rescue sessions and global donations."""

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.auth import decode_access_token
from app.database import SessionLocal
from app.events import build_global_snapshot, build_session_snapshot
from app.models import RescueSession, User
from app.realtime import CHANNEL_GLOBAL, hub, session_channel

router = APIRouter(tags=["websocket"])


async def _authenticate(websocket: WebSocket, db) -> User | None:
    """Authenticate a WebSocket from the `token` query parameter."""
    token = websocket.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        return await db.get(User, int(payload["sub"]))
    except Exception:
        return None


async def _stream(websocket: WebSocket, channel: str, queue=None) -> None:
    """Relay queued hub events until the client disconnects."""
    if queue is None:
        queue = hub.add_subscriber(channel)
    try:
        while True:
            receive_task = asyncio.create_task(websocket.receive_text())
            event_task = asyncio.create_task(queue.get())
            done, pending = await asyncio.wait(
                {receive_task, event_task},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            if pending:
                await asyncio.gather(*pending, return_exceptions=True)

            if receive_task in done:
                try:
                    receive_task.result()
                except (WebSocketDisconnect, RuntimeError):
                    break
                continue

            if event_task in done:
                await websocket.send_json(event_task.result())
    finally:
        hub.remove_subscriber(channel, queue)


@router.websocket("/ws/rescue-sessions/{session_id}")
async def watch_rescue_session(websocket: WebSocket, session_id: int) -> None:
    """Stream live events for one rescue session room."""
    await websocket.accept()
    async with SessionLocal() as db:
        user = await _authenticate(websocket, db)
        if user is None:
            await websocket.close(code=4401)
            return

        exists = await db.scalar(
            select(RescueSession.id).where(RescueSession.id == session_id)
        )
        if exists is None:
            await websocket.close(code=4404)
            return

        channel = session_channel(session_id)
        queue = hub.add_subscriber(channel)
        snapshot = await build_session_snapshot(db, session_id)
        if snapshot is not None:
            try:
                await websocket.send_json(snapshot.model_dump(mode="json"))
            except WebSocketDisconnect:
                hub.remove_subscriber(channel, queue)
                return

    # The queue stays subscribed while the database session is closed.
    await _stream(websocket, channel, queue)


@router.websocket("/ws/donations")
async def watch_global_donations(websocket: WebSocket) -> None:
    """Stream the global surplus donation discovery feed."""
    await websocket.accept()
    async with SessionLocal() as db:
        user = await _authenticate(websocket, db)
        if user is None:
            await websocket.close(code=4401)
            return

        queue = hub.add_subscriber(CHANNEL_GLOBAL)
        snapshot = await build_global_snapshot(db)
        if snapshot is not None:
            try:
                await websocket.send_json(snapshot.model_dump(mode="json"))
            except WebSocketDisconnect:
                hub.remove_subscriber(CHANNEL_GLOBAL, queue)
                return

    await _stream(websocket, CHANNEL_GLOBAL, queue)
