from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from database import events_collection
from schemas import EventCreate, EventResponse

router = APIRouter(prefix="/events", tags=["events"])


def _to_response(doc: Dict[str, Any]) -> EventResponse:
    return EventResponse(
        id=str(doc.get("_id")),
        email=doc.get("email", ""),
        date=doc.get("date", ""),
        event=doc.get("event", ""),
        location=doc.get("location", ""),
        created_at=doc.get("created_at"),
    )


@router.get("/{email}", response_model=List[EventResponse])
def list_events(email: str) -> List[EventResponse]:
    docs = events_collection.find({"email": email.strip().lower()}).sort("date", 1)
    return [_to_response(doc) for doc in docs]


@router.post("/", response_model=EventResponse)
def create_event(payload: EventCreate) -> EventResponse:
    now = datetime.utcnow().isoformat()
    email = payload.email.strip().lower()
    doc = {
        "email": email,
        "date": payload.date,
        "event": payload.event,
        "location": payload.location,
        "created_at": now,
    }
    result = events_collection.insert_one(doc)
    saved = events_collection.find_one({"_id": result.inserted_id})
    return _to_response(saved)


@router.delete("/{date}/{email}")
def delete_event(date: str, email: str) -> dict:
    email_lower = email.strip().lower()
    result = events_collection.delete_one({"email": email_lower, "date": date})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"deleted": True}
