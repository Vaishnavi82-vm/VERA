"""Outfit recommendation engine for Vera.

This module creates deterministic, non-random outfit combinations from wardrobe items and
scores them against color harmony, style compatibility, occasion suitability, season
suitability, user preferences, and saved feedback.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, TypedDict

from bson import ObjectId
from pymongo import ReturnDocument

from database import outfits_collection, preferences_collection
from db.wardrobe_store import list_wardrobe_for_user


COLOR_GROUPS: Dict[str, str] = {
    "black": "neutral",
    "white": "neutral",
    "gray": "neutral",
    "grey": "neutral",
    "beige": "neutral",
    "cream": "neutral",
    "tan": "neutral",
    "brown": "neutral",
    "navy": "blue",
    "blue": "blue",
    "red": "red",
    "burgundy": "red",
    "pink": "pink",
    "green": "green",
    "olive": "green",
    "yellow": "yellow",
    "mustard": "yellow",
    "orange": "orange",
    "purple": "purple",
}

STYLE_GROUPS: Dict[str, str] = {
    "casual": "casual",
    "street": "casual",
    "relaxed": "casual",
    "elegant": "elegant",
    "formal": "elegant",
    "office": "elegant",
    "classic": "classic",
    "minimal": "classic",
    "trendy": "modern",
    "modern": "modern",
    "sporty": "sporty",
    "boho": "boho",
    "edgy": "edgy",
}

OCCASION_ALIASES: Dict[str, List[str]] = {
    "everyday": ["everyday", "casual", "weekend"],
    "work": ["work", "office", "professional", "business"],
    "date": ["date", "dinner", "night out", "romantic"],
    "brunch": ["brunch", "daytime", "casual"],
    "party": ["party", "evening", "celebration"],
    "travel": ["travel", "vacation", "journey"],
    "wedding": ["wedding", "formal", "ceremony"],
}

SEASON_ALIASES: Dict[str, List[str]] = {
    "spring": ["spring", "mild"],
    "summer": ["summer", "hot", "warm"],
    "fall": ["fall", "autumn", "cool"],
    "winter": ["winter", "cold"],
}

CATEGORY_GROUPS: Dict[str, List[str]] = {
    "top": ["top", "tops", "shirt", "shirts", "blouse", "blouses", "tee", "tshirt", "t-shirts"],
    "bottom": ["bottom", "bottoms", "pant", "pants", "trouser", "trousers", "jeans", "skirt", "skirts"],
    "dress": ["dress", "dresses"],
    "footwear": ["footwear", "shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "heel", "heels", "sandal", "sandals"],
    "accessory": ["accessory", "accessories", "bag", "bags", "handbag", "handbags", "purse", "clutch", "belt", "belts", "jewelry", "jewellery", "scarf", "scarves"],
    "outerwear": ["outerwear", "coat", "coats", "jacket", "jackets", "blazer", "cardigan"],
    "ethnic": ["ethnic", "traditional", "sari", "saree", "kurta", "lehenga", "sherwani", "salwar", "kameez"],
}


class WardrobeItem(TypedDict, total=False):
    id: str
    category: str
    subcategory: str
    color: str
    pattern: str
    style: str
    seasons: List[str]
    occasions: List[str]
    fit: str
    item_name: str
    name: str
    created_at: str


def _normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def _split_tokens(value: str) -> List[str]:
    return [token for token in _normalize_text(value).replace("/", " ").split() if token]


def _color_group(color: str) -> str:
    for token in _split_tokens(color):
        if token in COLOR_GROUPS:
            return COLOR_GROUPS[token]
    return "neutral"


def _style_group(style: str) -> str:
    for token in _split_tokens(style):
        if token in STYLE_GROUPS:
            return STYLE_GROUPS[token]
    return _normalize_text(style) or "classic"


def _parse_seasons(value: Any) -> List[str]:
    if isinstance(value, list):
        tokens = [str(item).strip().lower() for item in value]
    else:
        tokens = _split_tokens(str(value or ""))
    return [token for token in tokens if token]


def _matches_alias(value: str, aliases: Dict[str, List[str]], target: str) -> bool:
    if not value or not target:
        return False
    value_norm = _normalize_text(value)
    target_norm = _normalize_text(target)
    if value_norm == target_norm:
        return True
    return value_norm in aliases.get(target_norm, [])


def _importance_score(value: float, default: float = 0.5) -> float:
    return max(0.0, min(1.0, value or default))


def _pairwise_average(values: Iterable[float]) -> float:
    items = list(values)
    if not items:
        return 0.0
    return sum(items) / len(items)


def _color_similarity(a: str, b: str) -> float:
    group_a = _color_group(a)
    group_b = _color_group(b)
    if group_a == group_b:
        return 1.0
    if group_a == "neutral" or group_b == "neutral":
        return 0.9
    complementary = {
        "blue": ["orange"],
        "red": ["green"],
        "yellow": ["purple"],
        "orange": ["blue"],
        "green": ["red"],
        "purple": ["yellow"],
    }
    if group_b in complementary.get(group_a, []):
        return 0.85
    return 0.5


def _style_compatibility(a: str, b: str) -> float:
    group_a = _style_group(a)
    group_b = _style_group(b)
    if group_a == group_b:
        return 1.0
    if group_a in {"casual", "sporty"} and group_b in {"casual", "sporty"}:
        return 0.85
    if group_a in {"elegant", "classic"} and group_b in {"elegant", "classic"}:
        return 0.9
    return 0.6


def _occasion_score(item: WardrobeItem, target_occasion: str) -> float:
    if not target_occasion:
        return 0.8
    occasions = item.get("occasions") or []
    if not occasions:
        return 0.8
    for occasion in occasions:
        if _matches_alias(occasion, OCCASION_ALIASES, target_occasion):
            return 1.0
    return 0.4


def _season_score(item: WardrobeItem, season: str) -> float:
    if not season:
        return 0.85
    seasons = _parse_seasons(item.get("seasons") or [])
    if not seasons:
        return 0.8
    normalized_season = _normalize_text(season)
    if normalized_season in seasons:
        return 1.0
    for token in seasons:
        if _matches_alias(token, SEASON_ALIASES, season):
            return 0.95
    return 0.3


def _preference_score(item: WardrobeItem, preferences: Dict[str, Any], occasion: str, mood: str) -> float:
    score = 0.0
    weight = 0
    style_pref = _normalize_text(preferences.get("style", ""))
    if style_pref:
        score += 1.0 if _style_group(item.get("style", "")) == _style_group(style_pref) else 0.5
        weight += 1
    if occasion:
        score += _occasion_score(item, occasion)
        weight += 1
    if mood:
        mood_token = _normalize_text(mood)
        if mood_token and mood_token in _normalize_text(item.get("style", "")):
            score += 1.0
        else:
            score += 0.6
        weight += 1
    if weight == 0:
        return 0.75
    return score / weight


def _feedback_boost(item_id: str) -> float:
    pipeline = [
        {"$match": {"item_ids": item_id}},
        {
            "$group": {
                "_id": None,
                "liked": {"$sum": {"$cond": ["$liked", 1, 0]}},
                "disliked": {"$sum": {"$cond": ["$disliked", 1, 0]}},
                "count": {"$sum": 1},
            }
        },
    ]
    result = list(outfits_collection.aggregate(pipeline))
    if not result:
        return 0.0
    row = result[0]
    count = row.get("count", 1)
    liked = row.get("liked", 0)
    disliked = row.get("disliked", 0)
    return max(-0.1, min(0.15, (liked - disliked) / max(count, 1) * 0.1))


def _score_outfit(
    items: List[WardrobeItem],
    preferences: Dict[str, Any],
    occasion: str,
    season: str,
    mood: str,
) -> Dict[str, Any]:
    colors = [item.get("color", "") for item in items]
    color_pairs = []
    for i, a in enumerate(colors):
        for b in colors[i + 1 :]:
            color_pairs.append(_color_similarity(a, b))
    color_harmony = _pairwise_average(color_pairs) if color_pairs else 1.0

    style_pairs = []
    styles = [item.get("style", "") for item in items]
    for i, a in enumerate(styles):
        for b in styles[i + 1 :]:
            style_pairs.append(_style_compatibility(a, b))
    style_score = _pairwise_average(style_pairs) if style_pairs else 0.85

    occasion_scores = [_occasion_score(item, occasion) for item in items]
    season_scores = [_season_score(item, season) for item in items]
    preference_scores = [_preference_score(item, preferences, occasion, mood) for item in items]
    feedback_scores = [_feedback_boost(item["id"]) for item in items]

    outfit_score = (
        color_harmony * 0.28
        + style_score * 0.24
        + _pairwise_average(occasion_scores) * 0.18
        + _pairwise_average(season_scores) * 0.12
        + _pairwise_average(preference_scores) * 0.12
        + _pairwise_average(feedback_scores) * 0.06
    )
    normalized_score = max(0.0, min(1.0, outfit_score))
    return {
        "score": normalized_score,
        "color_harmony": (
            "Natural harmony"
            if color_harmony >= 0.85
            else "Balanced contrast"
            if color_harmony >= 0.65
            else "Elevated mix"
            if color_harmony >= 0.45
            else "Bold contrast"
        ),
        "style_compatibility": round(style_score, 3),
        "confidence": round(normalized_score, 3),
    }


def _sort_items(items: List[WardrobeItem]) -> List[WardrobeItem]:
    return sorted(items, key=lambda item: (
        _normalize_text(item.get("category", "")),
        _normalize_text(item.get("style", "")),
        item.get("id", ""),
    ))


def _group_items(items: List[WardrobeItem]) -> Dict[str, List[WardrobeItem]]:
    groups = {"top": [], "bottom": [], "dress": [], "footwear": [], "accessory": [], "outerwear": [], "ethnic": []}
    for item in items:
        category = _normalize_text(item.get("category", ""))
        placed = False
        for key, aliases in CATEGORY_GROUPS.items():
            if category in aliases or any(alias in category for alias in aliases):
                groups[key].append(item)
                placed = True
                break
        if not placed and item.get("subcategory"):
            subgroup = _normalize_text(item["subcategory"])
            if subgroup in CATEGORY_GROUPS.get("accessory", []):
                groups["accessory"].append(item)
    return {name: _sort_items(group)[:6] for name, group in groups.items()}


def _build_combinations(
    tops: List[WardrobeItem],
    bottoms: List[WardrobeItem],
    dresses: List[WardrobeItem],
    footwear: List[WardrobeItem],
    accessories: List[WardrobeItem],
    outerwear: List[WardrobeItem],
    ethnic: List[WardrobeItem],
) -> List[List[WardrobeItem]]:
    outfits: List[List[WardrobeItem]] = []
    accessory_options = [[], *[[accessories[i]] for i in range(min(len(accessories), 2))]]
    outerwear_options = [[], *[[outerwear[i]] for i in range(min(len(outerwear), 1))]]
    ethnic_options = [[], *[[ethnic[i]] for i in range(min(len(ethnic), 1))]]

    for dress in dresses:
        for shoe in footwear:
            for outer_item in outerwear_options:
                for ethnic_item in ethnic_options:
                    for accessory_set in accessory_options:
                        outfits.append([dress, shoe, *outer_item, *ethnic_item, *accessory_set])

    for top in tops:
        for bottom in bottoms:
            for shoe in footwear:
                for outer_item in outerwear_options:
                    for ethnic_item in ethnic_options:
                        for accessory_set in accessory_options:
                            outfits.append([top, bottom, shoe, *outer_item, *ethnic_item, *accessory_set])

    return outfits


def recommend_outfits_for_user(
    email: str,
    occasion: str = "everyday",
    mood: str = "",
    season: str = "",
    count: int = 5,
) -> List[Dict[str, Any]]:
    items = list_wardrobe_for_user(email)
    preferences = preferences_collection.find_one({"email": email}) or {}
    if not items:
        return []

    groups = _group_items(items)
    candidates = _build_combinations(
        tops=groups["top"],
        bottoms=groups["bottom"],
        dresses=groups["dress"],
        footwear=groups["footwear"],
        accessories=groups["accessory"],
        outerwear=groups["outerwear"],
        ethnic=groups["ethnic"],
    )
    if not candidates:
        return []

    scored: List[Dict[str, Any]] = []
    for idx, candidate in enumerate(candidates):
        metadata = _score_outfit(candidate, preferences, occasion, season, mood)
        item_ids = [item["id"] for item in candidate if item.get("id")]
        reasoning = (
            f"A {occasion} look with {', '.join({item.get('category','').title() for item in candidate})}."
        )
        scored.append(
            {
                "id": "outfit-" + "-".join(item_ids),
                "email": email,
                "outfit_name": f"{occasion.title()} {mood.title() if mood else 'Look'}",
                "item_ids": item_ids,
                "reasoning": reasoning,
                "occasion": occasion,
                "mood": mood or "",
                "season": season or "",
                "confidence": metadata["confidence"],
                "score": metadata["score"],
                "color_harmony": metadata["color_harmony"],
                "style_compatibility": metadata["style_compatibility"],
                "suggested_accessories": [item.get("name") or item.get("subcategory") or item.get("category") for item in candidate if item.get("category") == "accessory"],
                "saved": False,
                "worn": False,
                "liked": False,
                "disliked": False,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
        )

    scored.sort(key=lambda row: (-row["score"], row["id"]))
    return scored[:min(count, len(scored))]


def _resolve_id(value: Optional[str]) -> Any:
    if not value:
        return None
    try:
        return ObjectId(value)
    except Exception:
        return value


def record_outfit_feedback(
    outfit_id: str,
    liked: Optional[bool] = None,
    disliked: Optional[bool] = None,
    worn: Optional[bool] = None,
) -> Dict[str, Any]:
    target_id = _resolve_id(outfit_id)
    update_fields: Dict[str, Any] = {}
    if liked is not None:
        update_fields["liked"] = liked
    if disliked is not None:
        update_fields["disliked"] = disliked
    if worn is not None:
        update_fields["worn"] = worn
    if not update_fields:
        raise ValueError("No feedback provided")
    update_fields["updated_at"] = datetime.utcnow().isoformat()
    result = outfits_collection.find_one_and_update(
        {"_id": target_id},
        {"$set": update_fields},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise ValueError("Outfit not found")
    return result
