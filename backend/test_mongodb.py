#!/usr/bin/env python
"""Test MongoDB connection and basic operations."""
import os
import sys
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, OperationFailure

load_dotenv()

def test_mongodb():
    """Test MongoDB connection and operations."""
    print("=" * 60)
    print("MONGODB CONNECTION TEST")
    print("=" * 60)
    
    # Check environment variable
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI environment variable is NOT set")
        print("   Please add MONGO_URI to your .env file")
        return False
    
    print(f"✓ MONGO_URI is set: {mongo_uri[:50]}..." if len(mongo_uri) > 50 else f"✓ MONGO_URI is set: {mongo_uri}")
    
    # Try to connect
    print("\nAttempting connection...")
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        # Force connection test
        client.admin.command('ping')
        print("✓ MongoDB connection successful!")
        
        # Check database
        db_name = os.getenv("MONGO_DB", "vera_db")
        db = client[db_name]
        print(f"✓ Database selected: {db_name}")
        
        # List collections
        collections = db.list_collection_names()
        print(f"✓ Collections in database: {collections if collections else 'None (empty database)'}")
        
        # Test wardrobe collection
        wardrobe_collection = db["wardrobe"]
        count = wardrobe_collection.count_documents({})
        print(f"✓ Wardrobe collection has {count} documents")
        
        # Test chat_history collection
        chat_collection = db["chat_history"]
        chat_count = chat_collection.count_documents({})
        print(f"✓ Chat history collection has {chat_count} documents")
        
        # Test write operation
        print("\nTesting write operation...")
        test_doc = {"test": "connection_test", "timestamp": __import__('datetime').datetime.now()}
        result = wardrobe_collection.insert_one(test_doc)
        print(f"✓ Successfully inserted test document: {result.inserted_id}")
        
        # Clean up
        wardrobe_collection.delete_one({"_id": result.inserted_id})
        print("✓ Successfully cleaned up test document")
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED - MongoDB is working properly!")
        print("=" * 60)
        client.close()
        return True
        
    except ServerSelectionTimeoutError:
        print("❌ Connection timeout - Cannot reach MongoDB server")
        print("   Check if MongoDB is running and the MONGO_URI is correct")
        return False
    except OperationFailure as e:
        print(f"❌ Operation failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    success = test_mongodb()
    sys.exit(0 if success else 1)
