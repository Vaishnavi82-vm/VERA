from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from database import reviews_collection
from schemas import ReviewCreate, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _to_response(doc: Dict[str, Any]) -> ReviewResponse:
    return ReviewResponse(
        id=str(doc.get("_id")),
        email=doc.get("email", ""),
        rating=doc.get("rating", 0),
        title=doc.get("title", ""),
        body=doc.get("body", ""),
        created_at=doc.get("created_at"),
    )


@router.get("/{email}", response_model=List[ReviewResponse])
def list_reviews(email: str) -> List[ReviewResponse]:
    docs = reviews_collection.find({"email": email.strip().lower()}).sort("created_at", -1)
    return [_to_response(doc) for doc in docs]


@router.post("/", response_model=ReviewResponse)
def create_review(payload: ReviewCreate) -> ReviewResponse:
    now = datetime.utcnow().isoformat()
    email = payload.email.strip().lower()
    doc = {
        "email": email,
        "rating": payload.rating,
        "title": payload.title,
        "body": payload.body,
        "created_at": now,
    }
    result = reviews_collection.insert_one(doc)
    saved = reviews_collection.find_one({"_id": result.inserted_id})
    return _to_response(saved)


@router.delete("/{review_id}")
def delete_review(review_id: str) -> dict:
    try:
        target_id = ObjectId(review_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid review ID")
    
    result = reviews_collection.delete_one({"_id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"deleted": True}
