from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from .database import SessionLocal
from .access import can
from .models import AuthSession, Patient, StaffUser
from .security import hash_session_token, utcnow
from .browser_sessions import (
    allowed_origin,
    cookie_name,
    session_is_active,
    staff_state_hash,
)


router = APIRouter(tags=["realtime"])


@dataclass
class RealtimeConnection:
    websocket: WebSocket
    audience: str
    user_id: int
    token_hash: str


class ConsultationRealtimeManager:
    def __init__(self) -> None:
        self._connections: dict[int, RealtimeConnection] = {}

    def add(self, connection: RealtimeConnection) -> None:
        self._connections[id(connection.websocket)] = connection

    def remove(self, websocket: WebSocket) -> None:
        self._connections.pop(id(websocket), None)

    async def publish(self, event: dict[str, Any], patient_id: int) -> None:
        stale: list[WebSocket] = []
        for connection in list(self._connections.values()):
            if await asyncio.to_thread(_authenticate_hash, connection.token_hash) != (
                connection.audience,
                connection.user_id,
            ):
                try:
                    await connection.websocket.close(
                        code=4401, reason="Session expired or revoked"
                    )
                except (RuntimeError, WebSocketDisconnect):
                    pass
                stale.append(connection.websocket)
                continue
            if connection.audience != "staff" and not (
                connection.audience == "patient" and connection.user_id == patient_id
            ):
                continue
            try:
                await connection.websocket.send_json(event)
            except (RuntimeError, WebSocketDisconnect):
                stale.append(connection.websocket)
        for websocket in stale:
            self.remove(websocket)


manager = ConsultationRealtimeManager()


def _authenticate(token: str) -> tuple[str, int] | None:
    if not token:
        return None
    return _authenticate_hash(hash_session_token(token))


def _authenticate_hash(token_hash: str) -> tuple[str, int] | None:
    with SessionLocal() as db:
        auth_session = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == token_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > utcnow(),
            )
        )
        if not auth_session or not session_is_active(auth_session):
            return None
        if auth_session.staff_id:
            staff = db.get(StaffUser, auth_session.staff_id)
            if (
                staff
                and staff.is_active
                and auth_session.staff_state_hash == staff_state_hash(staff)
            ):
                return ("staff", staff.id) if can(staff, "consultations.view") else None
        if auth_session.patient_id:
            patient = db.get(Patient, auth_session.patient_id)
            if patient and patient.is_active:
                return "patient", patient.id
        auth_session.revoked_at = utcnow()
        db.commit()
    return None


async def publish_consultation_event(
    *,
    appointment_id: int,
    patient_id: int,
    sender_type: str,
    message_id: int,
) -> None:
    await manager.publish(
        {
            "type": "consultation.message",
            "appointment_id": appointment_id,
            "message_id": message_id,
            "sender_type": sender_type,
        },
        patient_id,
    )


@router.websocket("/realtime")
async def consultation_realtime(websocket: WebSocket) -> None:
    origin = websocket.headers.get("origin")
    # Database work runs in a worker thread: a slow query must never freeze the event loop that
    # answers every other WebSocket handshake.
    if origin and not await asyncio.to_thread(allowed_origin, origin):
        await websocket.close(code=4403)
        return
    await websocket.accept()
    try:
        payload = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        if not isinstance(payload, dict):
            await websocket.close(code=4401)
            return
        token = str(payload.get("token", ""))
        audience_requested = payload.get("audience")
        if not token and origin and audience_requested in {"staff", "patient"}:
            token = websocket.cookies.get(cookie_name(audience_requested), "")
        identity = await asyncio.to_thread(_authenticate, token)
        if audience_requested and identity and identity[0] != audience_requested:
            identity = None
        if not identity:
            await websocket.close(code=4401, reason="Authentication required")
            return
        audience, user_id = identity
        manager.add(
            RealtimeConnection(
                websocket=websocket,
                audience=audience,
                user_id=user_id,
                token_hash=hash_session_token(token),
            )
        )
        await websocket.send_json({"type": "realtime.ready", "audience": audience})
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=25)
            except TimeoutError:
                await websocket.send_json({"type": "realtime.ping"})
            if await asyncio.to_thread(_authenticate_hash, await asyncio.to_thread(hash_session_token, token)) != identity:
                await websocket.close(code=4401, reason="Session expired or revoked")
                return
    except (TimeoutError, ValueError, WebSocketDisconnect):
        pass
    finally:
        manager.remove(websocket)
