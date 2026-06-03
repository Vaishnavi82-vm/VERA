from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException

from database import contact_messages_collection
from schemas import ContactMessageCreate, ContactMessageResponse

router = APIRouter(prefix="/contact", tags=["contact"])


def _to_response(doc: Dict[str, Any]) -> ContactMessageResponse:
    return ContactMessageResponse(
        id=str(doc.get("_id")),
        email=doc.get("email", ""),
        name=doc.get("name", ""),
        contact_email=doc.get("contact_email", ""),
        topic=doc.get("topic", ""),
        body=doc.get("body", ""),
        created_at=doc.get("created_at"),
    )


@router.get("/messages/{email}", response_model=List[ContactMessageResponse])
def list_contact_messages(email: str) -> List[ContactMessageResponse]:
    docs = contact_messages_collection.find({"email": email.strip().lower()}).sort("created_at", -1)
    return [_to_response(doc) for doc in docs]


@router.post("/", response_model=ContactMessageResponse)
def create_contact_message(payload: ContactMessageCreate) -> ContactMessageResponse:
    now = datetime.utcnow().isoformat()
    email = payload.email.strip().lower()
    doc = {
        "email": email,
        "name": payload.name,
        "contact_email": payload.contact_email,
        "topic": payload.topic,
        "body": payload.body,
        "created_at": now,
    }
    result = contact_messages_collection.insert_one(doc)
    saved = contact_messages_collection.find_one({"_id": result.inserted_id})
    return _to_response(saved)


@router.delete("/{message_id}")
def delete_contact_message(message_id: str) -> dict:
    try:
        target_id = ObjectId(message_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    result = contact_messages_collection.delete_one({"_id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"deleted": True}
