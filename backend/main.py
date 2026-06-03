"""
VeraStyle Vault — FastAPI entrypoint.

Run from inside `backend/`:
    uvicorn main:app --reload --host 127.0.0.1 --port 9001

Or from repo root:
    uvicorn main:app --app-dir backend --reload --host 127.0.0.1 --port 9001
"""

from __future__ import annotations

import uvicorn
from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import UPLOAD_DIR, cors_origins
from db.wardrobe_store import ensure_storage
from routes import auth, chat, health, upload, outfits, preferences, wardrobe, events, reviews, wishlist, contact

ensure_storage()

app = FastAPI(title="Vera API", version="1.0.0")

_origins = cors_origins()

# Regex covers Vite with host "::"
_local_origin_regex = r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins if _origins else ["*"],
    allow_origin_regex=_local_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(auth.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")
app.include_router(outfits.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(wardrobe.router, prefix="/api")


@app.get("/")
def home() -> Dict[str, str]:
    return {"message": "Vera backend running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)