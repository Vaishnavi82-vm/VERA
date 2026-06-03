from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from database import wishlist_collection
from schemas import WishlistResponse

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


def _to_response(doc: Dict[str, Any]) -> WishlistResponse:
    return WishlistResponse(
        email=doc.get("email", ""),
        item_ids=doc.get("item_ids", []),
        updated_at=doc.get("updated_at"),
    )


@router.get("/{email}", response_model=WishlistResponse)
def get_wishlist(email: str) -> WishlistResponse:
    email_lower = email.strip().lower()
    doc = wishlist_collection.find_one({"email": email_lower})
    if not doc:
        now = datetime.utcnow().isoformat()
        wishlist_collection.insert_one({
            "email": email_lower,
            "item_ids": [],
            "updated_at": now,
        })
        return WishlistResponse(email=email_lower, item_ids=[], updated_at=now)
    return _to_response(doc)


@router.post("/{email}/{item_id}", response_model=WishlistResponse)
def toggle_wishlist_item(email: str, item_id: str) -> WishlistResponse:
    email_lower = email.strip().lower()
    now = datetime.utcnow().isoformat()
    
    existing = wishlist_collection.find_one({"email": email_lower})
    if not existing:
        wishlist_collection.insert_one({
            "email": email_lower,
            "item_ids": [item_id],
            "updated_at": now,
        })
    else:
        item_ids = existing.get("item_ids", [])
        if item_id in item_ids:
            item_ids.remove(item_id)
        else:
            item_ids.append(item_id)
        
        wishlist_collection.update_one(
            {"email": email_lower},
            {"$set": {"item_ids": item_ids, "updated_at": now}},
        )
    
    updated = wishlist_collection.find_one({"email": email_lower})
    return _to_response(updated)


@router.delete("/{email}/{item_id}", response_model=WishlistResponse)
def remove_wishlist_item(email: str, item_id: str) -> WishlistResponse:
    email_lower = email.strip().lower()
    now = datetime.utcnow().isoformat()
    
    wishlist_collection.update_one(
        {"email": email_lower},
        {
            "$pull": {"item_ids": item_id},
            "$set": {"updated_at": now},
        },
        upsert=True,
    )
    
    updated = wishlist_collection.find_one({"email": email_lower})
    if not updated:
        return WishlistResponse(email=email_lower, item_ids=[], updated_at=now)
    return _to_response(updated)
