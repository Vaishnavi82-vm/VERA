"""Read wardrobe metadata for the logged-in user (by email)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Path, Query

from database import wardrobe_collection
from db.wardrobe_store import list_wardrobe_for_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["wardrobe"])


@router.get("/wardrobe")
def get_wardrobe(email: str = Query(..., min_length=1, description="User email (same as client auth)")) -> Dict[str, Any]:
    logger.debug("Wardrobe request received for email=%s", email)
    items: List[Dict[str, Any]] = list_wardrobe_for_user(email)
    logger.info("Loaded %d wardrobe items for email=%s", len(items), email)
    return {"items": items, "count": len(items)}


@router.delete("/wardrobe/{item_id}")
def delete_wardrobe_item(item_id: str = Path(..., description="Wardrobe item ID")) -> Dict[str, Any]:
    try:
        result = wardrobe_collection.delete_one({"_id": ObjectId(item_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid wardrobe item id")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")
    return {"success": True}


@router.patch("/wardrobe/{item_id}/worn")
def mark_wardrobe_item_worn(item_id: str = Path(..., description="Wardrobe item ID")) -> Dict[str, Any]:
    try:
        update_result = wardrobe_collection.update_one({"_id": ObjectId(item_id)}, {"$inc": {"worn_count": 1}})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid wardrobe item id")
    if update_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")
    item = wardrobe_collection.find_one({"_id": ObjectId(item_id)})
    worn_count = int(item.get("worn_count", 0)) if item else 0
    return {"success": True, "worn_count": worn_count}
