from __future__ import annotations

import hashlib
import hmac
import secrets
import binascii
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pymongo import ReturnDocument

from database import users_collection
from schemas import AuthLoginRequest, AuthOnboardedRequest, AuthSignupRequest, AuthUserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

PASSWORD_ITERATIONS = 120_000


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    )
    return f"{salt}${binascii.hexlify(digest).decode('ascii')}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    )
    return hmac.compare_digest(binascii.hexlify(candidate).decode('ascii'), digest)


def _format_user(doc: Dict[str, Any]) -> AuthUserResponse:
    return AuthUserResponse(
        id=str(doc.get("_id")),
        email=doc["email"],
        name=doc["name"],
        onboarded=doc.get("onboarded", False),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )


@router.post("/signup", response_model=AuthUserResponse)
def signup(payload: AuthSignupRequest) -> AuthUserResponse:
    email = payload.email.strip().lower()
    if users_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with that email already exists")

    now = datetime.utcnow().isoformat()
    password_hash = _hash_password(payload.password)
    result = users_collection.insert_one(
        {
            "email": email,
            "name": payload.name.strip(),
            "password_hash": password_hash,
            "onboarded": False,
            "created_at": now,
            "updated_at": now,
        }
    )
    doc = users_collection.find_one({"_id": result.inserted_id})
    return _format_user(doc)


@router.post("/login", response_model=AuthUserResponse)
def login(payload: AuthLoginRequest) -> AuthUserResponse:
    email = payload.email.strip().lower()
    user = users_collection.find_one({"email": email})
    if not user or not _verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _format_user(user)


@router.get("/user/{email}", response_model=AuthUserResponse)
def get_user(email: str) -> AuthUserResponse:
    user_email = email.strip().lower()
    user = users_collection.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _format_user(user)


@router.put("/onboarded", response_model=AuthUserResponse)
def mark_onboarded(payload: AuthOnboardedRequest) -> AuthUserResponse:
    email = payload.email.strip().lower()
    now = datetime.utcnow().isoformat()
    result = users_collection.find_one_and_update(
        {"email": email},
        {"$set": {"onboarded": True, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return _format_user(result)
