from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from database import preferences_collection
from schemas import PreferenceCreate, PreferenceResponse

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _format_pref(doc: Dict[str, Any]) -> PreferenceResponse:
    return PreferenceResponse(
        email=doc["email"],
        style=doc.get("style", ""),
        lifestyle=doc.get("lifestyle", ""),
        location=doc.get("location", ""),
        restrictions=doc.get(
            "restrictions",
            {
                "sleevelessAllowed": True,
                "shortOutfitsAllowed": True,
            },
        ),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )


@router.get("/{email}", response_model=PreferenceResponse)
def get_preferences(email: str) -> PreferenceResponse:
    pref = preferences_collection.find_one(
        {"email": email.strip().lower()}
    )

    if not pref:
        raise HTTPException(
            status_code=404,
            detail="Preferences not found",
        )

    return _format_pref(pref)


@router.put("/{email}", response_model=PreferenceResponse)
def update_preferences(
    email: str,
    payload: PreferenceCreate,
) -> PreferenceResponse:

    email_key = email.strip().lower()
    now = datetime.utcnow().isoformat()

    update_doc = {
        "email": email_key,
        "style": payload.style,
        "lifestyle": payload.lifestyle,
        "location": payload.location,
        "restrictions": payload.restrictions.model_dump(),
        "updated_at": now,
    }

    existing = preferences_collection.find_one(
        {"email": email_key}
    )

    if not existing:
        update_doc["created_at"] = now
    else:
        update_doc["created_at"] = existing.get(
            "created_at",
            now,
        )

    preferences_collection.replace_one(
        {"email": email_key},
        update_doc,
        upsert=True,
    )

    return _format_pref(update_doc)