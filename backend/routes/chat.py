from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter

from database import chat_collection, outfits_collection, preferences_collection
from db.wardrobe_store import list_wardrobe_for_user
from schemas import ChatRequest, ChatResponse
from services.recommendation import recommend_outfits_for_user

router = APIRouter(tags=["chat"])


def _sanitize_email(raw: str | None) -> str | None:
    if raw is None:
        return None

    value = str(raw).strip().lower()
    if not value or "@" not in value:
        return None
    return value[:254]


def _tokens(value: str) -> List[str]:
    return [token for token in value.lower().replace("/", " ").split() if token]


def _is_greeting(message: str) -> bool:
    msg = message.lower().strip()
    greetings = [
        "hi",
        "hello",
        "hey",
        "good morning",
        "good evening",
        "how are you",
        "bye",
        "thanks",
    ]
    return any(word in msg for word in greetings)


def _item_text(item: Dict[str, Any]) -> str:
    return (
        f"{item.get('item_name', '')} "
        f"{item.get('name', '')} "
        f"{item.get('title', '')} "
        f"{item.get('category', '')} "
        f"{item.get('subcategory', '')} "
        f"{item.get('color', '')} "
        f"{item.get('primary_color', '')} "
        f"{item.get('style', '')} "
        f"{' '.join(item.get('occasions') or [])} "
        f"{' '.join(item.get('seasons') or [])}"
    ).lower()


def _item_label(item: Dict[str, Any]) -> str:
    name = item.get("name") or item.get("title") or item.get("item_name") or item.get("subcategory")
    category = item.get("category") or "item"
    color = item.get("primary_color") or item.get("color")
    label = str(name or category).strip()
    details = [str(value).strip() for value in [color, category] if value]
    return f"{label} ({', '.join(details)})" if details else label


def pick_relevant_items(items: List[Dict[str, Any]], message: str) -> List[Dict[str, Any]]:
    msg = message.lower()
    scored: List[tuple[int, Dict[str, Any]]] = []

    for item in items:
        score = 0
        text = _item_text(item)

        for word in _tokens(msg):
            if word in text:
                score += 2

        if any(word in msg for word in ["meeting", "office", "formal", "interview", "work"]):
            if any(word in text for word in ["shirt", "blazer", "pant", "trouser", "shoe", "formal"]):
                score += 3

        if any(word in msg for word in ["party", "date", "outing", "dinner"]):
            if any(word in text for word in ["dress", "heel", "top", "bag", "elegant"]):
                score += 3

        if any(word in msg for word in ["rain", "weather", "cold", "winter"]):
            if any(word in text for word in ["black", "blue", "dark", "jacket", "coat", "boot"]):
                score += 2

        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda row: (-row[0], _item_label(row[1])))
    return [item for _, item in scored[:3]]


def _infer_occasion(message: str) -> str:
    msg = message.lower()
    mapping = {
        "work": ["work", "office", "meeting", "interview", "formal", "presentation"],
        "date": ["date", "dinner", "romantic"],
        "party": ["party", "club", "celebration", "night out"],
        "brunch": ["brunch", "lunch", "day out"],
        "travel": ["travel", "airport", "trip", "vacation"],
        "wedding": ["wedding", "ceremony", "reception"],
    }
    for occasion, words in mapping.items():
        if any(word in msg for word in words):
            return occasion
    return "everyday"


def _infer_season(message: str) -> str:
    msg = message.lower()
    for season in ["spring", "summer", "fall", "autumn", "winter"]:
        if season in msg:
            return "fall" if season == "autumn" else season
    if any(word in msg for word in ["hot", "warm", "sunny"]):
        return "summer"
    if any(word in msg for word in ["cold", "rain", "rainy", "chilly"]):
        return "winter"
    return ""


def _infer_mood(message: str) -> str:
    msg = message.lower()
    for mood in ["confident", "romantic", "minimal", "playful", "powerful", "casual", "elegant"]:
        if mood in msg:
            return mood
    return ""


def _format_preferences(preferences: Dict[str, Any] | None) -> str:
    if not preferences:
        return ""

    notes = []
    if preferences.get("style"):
        notes.append(f"{preferences['style']} style")
    if preferences.get("lifestyle"):
        notes.append(f"{preferences['lifestyle']} lifestyle")
    if preferences.get("location"):
        notes.append(f"based in {preferences['location']}")

    restrictions = preferences.get("restrictions") or {}
    if restrictions.get("sleevelessAllowed") is False:
        notes.append("avoid sleeveless pieces")
    if restrictions.get("shortOutfitsAllowed") is False:
        notes.append("avoid short outfits")

    return ", ".join(notes)


def _recent_outfit_context(email: str | None) -> str:
    if not email:
        return ""

    recent = list(outfits_collection.find({"email": email}).sort("updated_at", -1).limit(3))
    if not recent:
        return ""

    worn = [doc.get("outfit_name", "a saved look") for doc in recent if doc.get("worn")]
    liked = [doc.get("outfit_name", "a saved look") for doc in recent if doc.get("liked")]
    saved = [doc.get("outfit_name", "a saved look") for doc in recent if doc.get("saved")]

    parts = []
    if worn:
        parts.append(f"recently worn: {', '.join(worn[:2])}")
    if liked:
        parts.append(f"liked: {', '.join(liked[:2])}")
    if saved:
        parts.append(f"saved: {', '.join(saved[:2])}")
    return "; ".join(parts)


def _build_item_suggestion(items: List[Dict[str, Any]], message: str) -> str:
    picked = pick_relevant_items(items, message)
    if not picked:
        picked = items[:3]

    labels = [_item_label(item) for item in picked]
    if not labels:
        return ""
    if len(labels) == 1:
        return f"I would start with {labels[0]}."
    return f"I would start with {', '.join(labels[:-1])}, and {labels[-1]}."


def _build_recommendation(email: str | None, message: str) -> str:
    if not email:
        return ""

    recommendations = recommend_outfits_for_user(
        email=email,
        occasion=_infer_occasion(message),
        mood=_infer_mood(message),
        season=_infer_season(message),
        count=2,
    )
    if not recommendations:
        return ""

    lines = []
    for index, outfit in enumerate(recommendations, start=1):
        item_count = len(outfit.get("item_ids") or [])
        confidence = outfit.get("confidence")
        confidence_text = f" ({round(confidence * 100)}% match)" if isinstance(confidence, (int, float)) else ""
        lines.append(
            f"{index}. {outfit.get('outfit_name', 'Curated look')}: "
            f"{item_count} wardrobe pieces, {outfit.get('color_harmony', 'balanced palette')}{confidence_text}."
        )
    return "\n".join(lines)


def generate_local_reply(
    *,
    email: str | None,
    message: str,
    items: List[Dict[str, Any]],
    preferences: Dict[str, Any] | None,
) -> str:
    msg = message.lower().strip()
    pref_text = _format_preferences(preferences)
    history_text = _recent_outfit_context(email)

    if _is_greeting(message):
        wardrobe_note = (
            f"I can style from your {len(items)} wardrobe pieces"
            if items
            else "Upload a few wardrobe pieces and I can style from them"
        )
        return f"Hi, I'm VERA. {wardrobe_note}. Ask for a look by occasion, mood, color, or weather."

    if not items:
        pref_sentence = f" I will keep your preferences in mind: {pref_text}." if pref_text else ""
        return (
            "I do not see wardrobe pieces for this account yet. "
            "Add tops, bottoms, dresses, footwear, and accessories in Wardrobe, then I can build complete looks from your own items."
            f"{pref_sentence}"
        )

    wants_outfit = any(
        word in msg
        for word in ["wear", "outfit", "look", "style", "pair", "recommend", "suggest", "dress me"]
    )
    wants_color = any(word in msg for word in ["color", "colour", "match", "palette"])
    wants_history = any(word in msg for word in ["worn", "history", "repeat", "saved", "liked"])
    wants_weather = any(word in msg for word in ["rain", "weather", "hot", "cold", "summer", "winter"])

    if wants_history:
        if history_text:
            return (
                f"From your outfit history, I found {history_text}. "
                f"I would avoid repeating the same exact look today and rotate in {_build_item_suggestion(items, message)}"
            )
        return (
            "I do not see saved or worn outfit history yet. "
            "Once you save, like, or wear outfits, I can use that history to guide future styling."
        )

    item_suggestion = _build_item_suggestion(items, message)

    if wants_color:
        colors = []
        for item in items:
            color = item.get("primary_color") or item.get("color")
            if color and color not in colors:
                colors.append(color)
        palette = ", ".join(colors[:5]) if colors else "your uploaded colors"
        return (
            f"Your wardrobe palette includes {palette}. {item_suggestion} "
            "For a clean match, anchor the look with one neutral piece and let one color carry the outfit."
        )

    if wants_weather:
        season = _infer_season(message)
        weather_note = "For rainy or cold weather, prefer darker colors, covered footwear, and an outer layer."
        if season == "summer":
            weather_note = "For warm weather, choose lighter layers, breathable tops, and comfortable footwear."
        return f"{weather_note} {item_suggestion}"

    response_parts = []
    recommendation = _build_recommendation(email, message) if wants_outfit else ""
    if recommendation:
        response_parts.append("Here are local wardrobe-based looks I can recommend:\n" + recommendation)
    else:
        response_parts.append(item_suggestion)

    if pref_text:
        response_parts.append(f"I also considered your preferences: {pref_text}.")
    if history_text:
        response_parts.append(f"Recent outfit context: {history_text}.")

    return " ".join(part for part in response_parts if part)


def _store_chat_turn(email: str | None, message: str, reply: str, created_at: str) -> None:
    if not email:
        return

    chat_collection.insert_one(
        {
            "email": email,
            "message": message,
            "reply": reply,
            "created_at": created_at,
        }
    )


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    try:
        message = (payload.message or "").strip()
        email = _sanitize_email(payload.email)
        items = list_wardrobe_for_user(email)
        preferences = preferences_collection.find_one({"email": email}) if email else None
        created_at = datetime.utcnow().isoformat()

        text = generate_local_reply(
            email=email,
            message=message,
            items=items,
            preferences=preferences,
        )
        if not text:
            text = "I could not find enough wardrobe context for that request yet."

        _store_chat_turn(email, message, text, created_at)
        return ChatResponse(reply=text)

    except Exception as exc:
        message = (payload.message or "").strip()
        email = _sanitize_email(payload.email)
        text = f"Backend error: {str(exc)}"
        _store_chat_turn(email, message, text, datetime.utcnow().isoformat())
        return ChatResponse(reply=text)


def _chat_history_for_email(email: str) -> List[Dict[str, Any]]:
    normalized = _sanitize_email(email)
    if not normalized:
        return []

    docs = chat_collection.find({"email": normalized}).sort("created_at", 1)
    return [
        {
            "message": doc.get("message", ""),
            "reply": doc.get("reply", ""),
            "created_at": doc.get("created_at"),
        }
        for doc in docs
    ]


@router.get("/history/{email}")
def chat_history(email: str) -> List[Dict[str, Any]]:
    return _chat_history_for_email(email)


@router.get("/chat/history/{email}")
def chat_history_with_chat_prefix(email: str) -> List[Dict[str, Any]]:
    return _chat_history_for_email(email)
