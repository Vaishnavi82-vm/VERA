from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from pymongo import ReturnDocument

from database import outfits_collection
from schemas import OutfitCreate, OutfitResponse
from services.recommendation import recommend_outfits_for_user, record_outfit_feedback

router = APIRouter(prefix="/outfits", tags=["outfits"])


class OutfitUpdate(BaseModel):
    outfit_name: Optional[str] = None
    item_ids: Optional[List[str]] = None
    saved: Optional[bool] = None
    worn: Optional[bool] = None
    liked: Optional[bool] = None
    disliked: Optional[bool] = None


def _to_response(doc: Dict[str, Any]) -> OutfitResponse:
    return OutfitResponse(
        id=str(doc.get("_id") or doc.get("id") or ""),
        email=doc.get("email", ""),
        outfit_name=doc.get("outfit_name", ""),
        item_ids=doc.get("item_ids", []),
        reason=doc.get("reason"),
        occasion=doc.get("occasion"),
        mood=doc.get("mood"),
        season=doc.get("season"),
        confidence=doc.get("confidence"),
        score=doc.get("score"),
        color_harmony=doc.get("color_harmony"),
        style_compatibility=doc.get("style_compatibility"),
        suggested_accessories=doc.get("suggested_accessories", []),
        saved=doc.get("saved", False),
        worn=doc.get("worn", False),
        liked=doc.get("liked", False),
        disliked=doc.get("disliked", False),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )


def _resolve_id(value: Optional[str]) -> Any:
    if not value:
        return None
    try:
        return ObjectId(value)
    except Exception:
        return value


@router.get("/{email}", response_model=List[OutfitResponse])
def list_outfits(email: str) -> List[OutfitResponse]:
    docs = outfits_collection.find({"email": email.strip().lower()})
    return [_to_response(doc) for doc in docs]


@router.get("/recommend/{email}", response_model=List[OutfitResponse])
def recommend_outfits(
    email: str,
    occasion: str = Query("everyday", description="Target occasion for the outfit"),
    mood: str | None = Query(None, description="Target mood for the outfit"),
    season: str | None = Query(None, description="Target season for the outfit"),
    count: int = Query(5, ge=1, le=12, description="Maximum number of outfits to return"),
) -> List[OutfitResponse]:
    recommendations = recommend_outfits_for_user(
        email=email.strip().lower(),
        occasion=occasion,
        mood=mood or "",
        season=season or "",
        count=count,
    )
    return [_to_response(rec) for rec in recommendations]


@router.post("/", response_model=OutfitResponse)
def save_outfit(payload: OutfitCreate) -> OutfitResponse:
    now = datetime.utcnow().isoformat()
    doc = payload.dict(exclude_none=True)
    email = doc.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    existing_id = _resolve_id(doc.get("id"))
    if existing_id is not None:
        doc["_id"] = existing_id
    elif "id" in doc:
        doc.pop("id")

    save_id = doc.get("_id") or ObjectId()
    doc["_id"] = save_id
    doc["email"] = email
    doc["updated_at"] = now

    if not outfits_collection.find_one({"_id": save_id}):
        doc["created_at"] = now

    outfits_collection.replace_one({"_id": save_id}, doc, upsert=True)
    saved = outfits_collection.find_one({"_id": save_id})
    return _to_response(saved)


@router.patch("/{outfit_id}", response_model=OutfitResponse)
def update_outfit(outfit_id: str, payload: OutfitUpdate) -> OutfitResponse:
    target_id = _resolve_id(outfit_id)
    update_fields: Dict[str, Any] = {}
    if payload.outfit_name is not None:
        update_fields["outfit_name"] = payload.outfit_name
    if payload.item_ids is not None:
        update_fields["item_ids"] = payload.item_ids
    if payload.saved is not None:
        update_fields["saved"] = payload.saved
    if payload.worn is not None:
        update_fields["worn"] = payload.worn
    if payload.liked is not None:
        update_fields["liked"] = payload.liked
    if payload.disliked is not None:
        update_fields["disliked"] = payload.disliked

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = datetime.utcnow().isoformat()
    result = outfits_collection.find_one_and_update(
        {"_id": target_id},
        {"$set": update_fields},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return _to_response(result)


class OutfitFeedback(BaseModel):
    liked: bool | None = None
    disliked: bool | None = None
    worn: bool | None = None


@router.post("/{outfit_id}/feedback", response_model=OutfitResponse)
def outfit_feedback(outfit_id: str, payload: OutfitFeedback) -> OutfitResponse:
    if payload.liked is None and payload.disliked is None and payload.worn is None:
        raise HTTPException(status_code=400, detail="No feedback fields provided")

    try:
        updated = record_outfit_feedback(
            outfit_id=outfit_id,
            liked=payload.liked,
            disliked=payload.disliked,
            worn=payload.worn,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return _to_response(updated)


@router.delete("/{outfit_id}")
def delete_outfit(outfit_id: str) -> dict:
    target_id = _resolve_id(outfit_id)
    result = outfits_collection.delete_one({"_id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Outfit not found")
    return {"deleted": True}
