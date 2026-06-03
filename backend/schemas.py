"""Shared request/response models for the API."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=3000)
    email: str | None = Field(default=None, max_length=254)


class ChatResponse(BaseModel):
    reply: str


class AuthSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class AuthLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class AuthOnboardedRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)


class AuthUserResponse(BaseModel):
    id: str
    email: str
    name: str
    onboarded: bool
    created_at: str
    updated_at: str


class PreferenceRestrictions(BaseModel):
    sleevelessAllowed: bool = True
    shortOutfitsAllowed: bool = True


class PreferenceCreate(BaseModel):
    style: str = Field(..., min_length=1, max_length=80)
    lifestyle: str = Field(..., min_length=1, max_length=80)
    location: str = Field(..., min_length=1, max_length=80)
    restrictions: PreferenceRestrictions


class PreferenceResponse(PreferenceCreate):
    email: str
    created_at: str
    updated_at: str


class OutfitCreate(BaseModel):
    id: str | None = None
    email: str
    outfit_name: str = Field(..., min_length=1, max_length=120)
    item_ids: list[str] = Field(default_factory=list)
    reasoning: str | None = None
    occasion: str | None = None
    mood: str | None = None
    season: str | None = None
    confidence: float | None = None
    score: float | None = None
    color_harmony: str | None = None
    style_compatibility: float | None = None
    suggested_accessories: list[str] = Field(default_factory=list)
    saved: bool | None = None
    worn: bool | None = None
    liked: bool | None = None
    disliked: bool | None = None


class OutfitResponse(BaseModel):
    id: str
    email: str
    outfit_name: str
    item_ids: list[str]
    reasoning: str | None = None
    occasion: str | None = None
    mood: str | None = None
    season: str | None = None
    confidence: float | None = None
    score: float | None = None
    color_harmony: str | None = None
    style_compatibility: float | None = None
    suggested_accessories: list[str] = Field(default_factory=list)
    saved: bool = False
    worn: bool = False
    liked: bool = False
    disliked: bool = False
    created_at: str | None = None
    updated_at: str | None = None


class EventCreate(BaseModel):
    email: str
    date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    event: str = Field(..., min_length=1, max_length=200)
    location: str = Field(default="", max_length=200)


class EventResponse(EventCreate):
    id: str
    created_at: str


class ReviewCreate(BaseModel):
    email: str
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=10, max_length=1000)


class ReviewResponse(ReviewCreate):
    id: str
    created_at: str


class WishlistItemCreate(BaseModel):
    email: str
    item_id: str = Field(..., min_length=1, max_length=254)


class WishlistResponse(BaseModel):
    email: str
    item_ids: list[str]
    updated_at: str


class ContactMessageCreate(BaseModel):
    email: str
    name: str = Field(..., min_length=1, max_length=120)
    contact_email: str = Field(..., min_length=5, max_length=254)
    topic: str = Field(..., min_length=1, max_length=80)
    body: str = Field(..., min_length=10, max_length=2000)


class ContactMessageResponse(ContactMessageCreate):
    id: str
    created_at: str

