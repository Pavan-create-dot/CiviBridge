import requests
from config import GEMINI_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIM

def embed_text(text: str) -> list[float]:
    """
    Generates a 768-dimensional embedding vector for input text using
    Google Gemini embedding model.
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set.")

    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBEDDING_MODEL}:embedContent?key={GEMINI_API_KEY}"
    payload = {
        "model": EMBEDDING_MODEL,
        "content": {
            "parts": [{"text": text}]
        },
        "outputDimensionality": EMBEDDING_DIM
    }

    response = requests.post(url, json=payload, timeout=15)
    if not response.ok:
        raise RuntimeError(f"Embedding request failed: {response.status_code} - {response.text}")

    data = response.json()
    embedding = data.get("embedding", {}).get("values", [])
    if not embedding:
        raise RuntimeError(f"No embedding values returned by Gemini API: {data}")

    return embedding
