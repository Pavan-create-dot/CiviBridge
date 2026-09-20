import math
from datetime import datetime, timezone
from pymongo import MongoClient
from pymongo.errors import OperationFailure
from config import MONGODB_URI, DB_NAME

_client = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        if not MONGODB_URI:
            raise ValueError("MONGODB_URI is not set in environment.")
        _client = MongoClient(MONGODB_URI)
    return _client

def get_db():
    client = get_client()
    return client[DB_NAME]

def get_chunks_collection():
    db = get_db()
    return db["document_chunks"]

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)

def vector_search_chunks(query_vector: list[float], top_k: int = 5) -> list[dict]:
    """
    Performs vector similarity search on document_chunks.
    Tries MongoDB Atlas $vectorSearch first; if index is not yet built,
    gracefully computes cosine similarity to guarantee 100% uptime.
    """
    collection = get_chunks_collection()

    # 1. Attempt MongoDB Atlas $vectorSearch aggregation
    for index_name in ["vector_index", "default"]:
        try:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": index_name,
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": top_k * 10,
                        "limit": top_k,
                    }
                },
                {
                    "$project": {
                        "documentId": 1,
                        "chunkIndex": 1,
                        "content": 1,
                        "title": 1,
                        "source": 1,
                        "category": 1,
                        "score": {"$meta": "vectorSearchScore"},
                    }
                },
            ]
            results = list(collection.aggregate(pipeline))
            if results:
                return results
        except OperationFailure:
            pass  # Index not found or not ready yet on Atlas; fall through to direct search

    # 2. Resilient In-Database Cosine Ranking
    all_chunks = list(collection.find({"embedding": {"$exists": True, "$ne": []}}))
    if not all_chunks:
        return []

    scored = []
    for chunk in all_chunks:
        score = cosine_similarity(query_vector, chunk.get("embedding", []))
        scored.append({
            "_id": str(chunk.get("_id")),
            "documentId": chunk.get("documentId"),
            "chunkIndex": chunk.get("chunkIndex", 0),
            "content": chunk.get("content", ""),
            "title": chunk.get("title", ""),
            "source": chunk.get("source", ""),
            "category": chunk.get("category", ""),
            "score": score,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]
