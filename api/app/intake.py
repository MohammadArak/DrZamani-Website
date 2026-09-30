from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, status

from .models import Appointment, Service
from .schemas import AppointmentIntakeSubmission


EMPTY_FORM: dict[str, list[dict[str, Any]]] = {"questions": [], "consents": []}


def service_intake_snapshot(service: Service) -> dict[str, list[dict[str, Any]]]:
    return {
        "questions": [
            {
                "key": f"q-{item.id}",
                "label": item.label,
                "field_type": item.field_type,
                "options": item.options,
                "is_required": item.is_required,
                "sort_order": item.sort_order,
            }
            for item in sorted(service.intake_questions, key=lambda value: value.sort_order)
        ],
        "consents": [
            {
                "key": f"c-{item.id}",
                "title": item.title,
                "body": item.body,
                "is_required": item.is_required,
                "sort_order": item.sort_order,
            }
            for item in sorted(service.consents, key=lambda value: value.sort_order)
        ],
    }


def appointment_intake_form(item: Appointment) -> dict[str, list[dict[str, Any]]]:
    if item.intake_form_snapshot_json:
        try:
            value = json.loads(item.intake_form_snapshot_json)
            if isinstance(value, dict):
                return {
                    "questions": list(value.get("questions") or []),
                    "consents": list(value.get("consents") or []),
                }
        except (TypeError, json.JSONDecodeError):
            pass
    return service_intake_snapshot(item.service)


def appointment_intake_submission(item: Appointment) -> dict[str, Any] | None:
    if not item.intake_submission_json:
        return None
    try:
        value = json.loads(item.intake_submission_json)
    except (TypeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def validate_intake_submission(
    form: dict[str, list[dict[str, Any]]],
    payload: AppointmentIntakeSubmission,
) -> dict[str, Any]:
    questions = {str(item["key"]): item for item in form["questions"]}
    consents = {str(item["key"]): item for item in form["consents"]}
    unknown_answers = set(payload.answers) - set(questions)
    if unknown_answers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="پاسخ ارسالی با فرم این نوبت مطابقت ندارد",
        )
    normalized_answers: dict[str, str | bool] = {}
    for key, question in questions.items():
        value = payload.answers.get(key)
        field_type = question["field_type"]
        missing = value is None or (isinstance(value, str) and not value.strip())
        if missing:
            if question.get("is_required"):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"پاسخ به «{question['label']}» الزامی است",
                )
            continue
        if field_type == "yes_no":
            if not isinstance(value, bool):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"پاسخ «{question['label']}» باید بله یا خیر باشد",
                )
            normalized_answers[key] = value
            continue
        if not isinstance(value, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"پاسخ «{question['label']}» معتبر نیست",
            )
        value = value.strip()
        limit = 4000 if field_type == "long_text" else 300
        if len(value) > limit:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"پاسخ «{question['label']}» بیش از حد طولانی است",
            )
        if field_type == "single_choice" and value not in question.get("options", []):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"گزینه انتخاب‌شده برای «{question['label']}» معتبر نیست",
            )
        normalized_answers[key] = value

    accepted = set(payload.accepted_consents)
    if accepted - set(consents):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="رضایت ثبت‌شده با فرم این نوبت مطابقت ندارد",
        )
    for key, consent in consents.items():
        if consent.get("is_required") and key not in accepted:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"پذیرش «{consent['title']}» الزامی است",
            )
    return {
        "answers": normalized_answers,
        "accepted_consents": [
            item["key"] for item in form["consents"] if item["key"] in accepted
        ],
    }
