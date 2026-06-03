import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URI")
if not MONGO_URL:
    raise RuntimeError(
        "MONGO_URI environment variable is not set. See .env.example"
    )

client = MongoClient(MONGO_URL)

DB_NAME = os.getenv("MONGO_DB", "vera_db")
db = client[DB_NAME]

# Collections
wardrobe_collection = db["wardrobe"]
chat_collection = db["chat_history"]
users_collection = db["users"]
preferences_collection = db["preferences"]
outfits_collection = db["outfits"]
events_collection = db["events"]
reviews_collection = db["reviews"]
wishlist_collection = db["wishlist"]
contact_messages_collection = db["contact_messages"]

# Indexes
users_collection.create_index("email", unique=True)
preferences_collection.create_index("email", unique=True)
outfits_collection.create_index("email")
outfits_collection.create_index("created_at")
wardrobe_collection.create_index("email")
chat_collection.create_index("email")
chat_collection.create_index("created_at")
events_collection.create_index("email")
events_collection.create_index(("email", "date"))
reviews_collection.create_index("email")
reviews_collection.create_index("created_at")
wishlist_collection.create_index("email")
wishlist_collection.create_index("item_id")
contact_messages_collection.create_index("email")
contact_messages_collection.create_index("created_at")

print("MongoDB connected successfully to database:", DB_NAME)