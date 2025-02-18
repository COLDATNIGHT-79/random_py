import os
import json
from pymongo import MongoClient
from bson import ObjectId

# Helper class for JSON encoding of ObjectIds
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return json.JSONEncoder.default(self, o)

# Get your MongoDB connection string from the environment variable
MONGO_URI = os.environ.get("mongodb+srv://user:admin@cluster0.lgrfo.mongodb.net/")
if not MONGO_URI:
    raise Exception("MONGODB_URI environment variable not set")

client = MongoClient(MONGO_URI)
db = client.get_database("mydatabase")
collection = db.get_collection("messages")

def handler(event, context):
    method = event["httpMethod"]
    
    if method == "GET":
        # Fetch all messages
        messages = list(collection.find())
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": JSONEncoder().encode(messages)
        }
    
    elif method == "POST":
        try:
            data = json.loads(event["body"])
            message_text = data.get("message")
            if not message_text:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "No message provided"})
                }
            # Insert the new message (you could also add a timestamp here)
            result = collection.insert_one({"message": message_text})
            new_message = collection.find_one({"_id": result.inserted_id})
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                "body": JSONEncoder().encode(new_message)
            }
        except Exception as e:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)})
            }
    
    else:
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }
