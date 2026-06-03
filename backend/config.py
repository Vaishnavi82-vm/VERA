"""Environment and paths for Vera backend (no machine-specific absolute paths)."""
from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional until pip install

    def load_dotenv(*_args, **_kwargs) -> bool:
        return False


# Directory containing this file (the `backend/` package root)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=False)

DB_DIR = BASE_DIR / "db"
UPLOAD_DIR = BASE_DIR / "uploads"
METADATA_FILE = DB_DIR / "wardrobe_metadata.json"

ALLOWED_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif"})
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

# Match Vite dev (8080 in this repo) and common defaults; use 127.0.0.1 to avoid localhost/127 mix-ups
DEFAULT_CORS = (
    "http://127.0.0.1:8080,http://127.0.0.1:5173,http://127.0.0.1:3000,"
    "http://localhost:8080,http://localhost:5173,http://localhost:3000"
)


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", DEFAULT_CORS)
    return [o.strip() for o in raw.split(",") if o.strip()]
