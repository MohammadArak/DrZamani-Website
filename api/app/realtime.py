from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from .database import SessionLocal
from .models import AuthSession, Patient, StaffUser
from .security import hash_session_token, utcnow


router = APIRouter(tags=["realtime"])


@dataclass
class RealtimeConnection:
    websocket: WebSocket
    audience: str
    user_id: int


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
    with SessionLocal() as db:
        auth_session = db.scalar(
            select(AuthSession).where(
                AuthSession.token_hash == hash_session_token(token),
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > utcnow(),
            )
        )
        if not auth_session:
            return None
        if auth_session.staff_id:
            staff = db.get(StaffUser, auth_session.staff_id)
            if staff and staff.is_active:
                return "staff", staff.id
        if auth_session.patient_id:
            patient = db.get(Patient, auth_session.patient_id)
            if patient and patient.is_active:
                return "patient", patient.id
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
    await websocket.accept()
    try:
        payload = await asyncio.wait_for(websocket.receive_json(), timeout=10)
        identity = _authenticate(str(payload.get("token", "")))
        if not identity:
            await websocket.close(code=4401, reason="Authentication required")
            return
        audience, user_id = identity
        manager.add(
            RealtimeConnection(
                websocket=websocket,
                audience=audience,
                user_id=user_id,
            )
        )
        await websocket.send_json({"type": "realtime.ready", "audience": audience})
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=25)
            except TimeoutError:
                await websocket.send_json({"type": "realtime.ping"})
    except (TimeoutError, ValueError, WebSocketDisconnect):
        pass
    finally:
        manager.remove(websocket)
