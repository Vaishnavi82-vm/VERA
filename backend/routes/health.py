"""Health check for uptime and clone/CI smoke tests."""
from __future__ import annotations

from typing import Dict

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}
