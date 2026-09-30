from __future__ import annotations

import logging

from .database import SessionLocal
from .sms_automation import (
    dispatch_pending_sms,
    expire_unpaid_holds,
    queue_appointment_reminders,
)


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def run() -> None:
    with SessionLocal() as db:
        expired = expire_unpaid_holds(db)
        reminders = queue_appointment_reminders(db)
        sent = dispatch_pending_sms(db, limit=200)
    logger.info(
        "Appointment jobs completed: expired_holds=%s reminders=%s sms_sent=%s",
        expired,
        reminders,
        sent,
    )


if __name__ == "__main__":
    run()
