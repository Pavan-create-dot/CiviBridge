import json
import re
from datetime import datetime, timezone
import requests
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import GEMINI_API_KEY, GENERATION_MODEL
from database import get_chunks_collection, vector_search_chunks
from embeddings import embed_text
from models import RAGResponse, SourceCitation, GrievanceCategoryItem

LANGUAGE_NAMES = {
    "en": "English",
    "te": "Telugu (తెలుగు)",
    "hi": "Hindi (हिंदी)",
}

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=600,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
)

def index_document(document_id: str, title: str, content: str, source: str = "", category: str = "policy") -> int:
    """
    Splits document content into chunks, calculates 768-dim embeddings,
    and stores them in MongoDB document_chunks collection.
    """
    collection = get_chunks_collection()

    # 1. Clean existing chunks for this document
    collection.delete_many({"documentId": document_id})

    # 2. Split content into semantic chunks
    raw_chunks = text_splitter.split_text(content)
    if not raw_chunks:
        raw_chunks = [content]

    # 3. Embed and prepare chunk records
    chunk_docs = []
    for idx, chunk_text in enumerate(raw_chunks):
        text_to_embed = f"{title} (Chunk {idx + 1}): {chunk_text}"
        embedding = embed_text(text_to_embed)

        chunk_docs.append({
            "documentId": document_id,
            "chunkIndex": idx + 1,
            "content": chunk_text,
            "embedding": embedding,
            "title": title,
            "source": source or "Municipal Guidelines",
            "category": category,
            "createdAt": datetime.now(timezone.utc),
        })

    if chunk_docs:
        collection.insert_many(chunk_docs)

    return len(chunk_docs)

def delete_document_chunks(document_id: str) -> int:
    """
    Deletes all vector chunks associated with document_id.
    """
    collection = get_chunks_collection()
    res = collection.delete_many({"documentId": document_id})
    return res.deleted_count

def generate_petition_rag(grievance: str, language: str, categories: list[GrievanceCategoryItem]) -> RAGResponse:
    """
    Full RAG Pipeline:
    1. Embed grievance query.
    2. Vector similarity search over document_chunks (Top 5).
    3. Grounded Context Construction with categories + retrieved policy chunks.
    4. Structured generation via Gemini (gemini-flash-latest).
    5. Pydantic validation of output.
    """
    target_lang = LANGUAGE_NAMES.get(language, "English")

    # Step 1: Query embedding
    query_vector = embed_text(grievance)

    # Step 2: Vector search on document_chunks (Top 5)
    retrieved_chunks = vector_search_chunks(query_vector, top_k=5)

    # Step 3: Context Construction
    categories_context = "\n".join(
        [f"- Category: {c.name} | Department: {c.department} | Scope: {c.description}" for c in categories]
    ) or "Use general municipal administration departments."

    citations_list = []
    chunks_context_parts = []
    for idx, ch in enumerate(retrieved_chunks):
        title = ch.get("title", "Policy Document")
        src = ch.get("source", "")
        c_idx = ch.get("chunkIndex", idx + 1)
        content = ch.get("content", "")

        chunks_context_parts.append(
            f"[Source {idx + 1}: {title} | File: {src} | Chunk: {c_idx}]\n{content}"
        )
        citations_list.append(SourceCitation(
            title=title,
            source=src or "Municipal Guidelines",
            chunk_index=c_idx,
        ))

    chunks_context = "\n\n".join(chunks_context_parts) if chunks_context_parts else "No specific policy chunks retrieved. Rely on standard public safety laws."

    # Construct system prompt
    prompt = f"""You are CiviBridge, an AI civic grievance assistant drafting official municipal petitions.

ALLOWED MUNICIPAL CATEGORIES:
{categories_context}

RETRIEVED OFFICIAL GOVERNMENT GUIDELINES & CLAUSES (RAG CONTEXT):
{chunks_context}

CITIZEN GRIEVANCE DETAILS:
"{grievance}"

TASK INSTRUCTIONS:
1. Select the single best matching Category and Department from the ALLOWED MUNICIPAL CATEGORIES.
2. Determine grievance Priority: 'low', 'medium', 'high', or 'urgent'.
3. Draft a concise, formal official petition body strictly in {target_lang}.
   - The petition body must be respectful, articulate, and cite applicable standards/regulations mentioned in the retrieved clauses.
   - Do NOT include TO: or SUBJECT: headers (they are generated separately in the official letterhead template).
4. Return ONLY a valid JSON object matching the exact schema below:

{{
  "category": "<Exact name from allowed categories>",
  "department": "<Responsible department name>",
  "priority": "<low | medium | high | urgent>",
  "petition": "<Formal petition body text written in {target_lang}>",
  "sources": [
    {{
      "title": "<Document title from retrieved context>",
      "source": "<Source document file name>",
      "chunk_index": <Integer chunk number>
    }}
  ]
}}
"""

    # Step 4: Invoke Gemini with fallback models for 503/429 resilience
    candidate_models = [
        GENERATION_MODEL,
        "models/gemini-flash-lite-latest",
        "models/gemini-pro-latest",
    ]

    last_error = None
    resp_data = None

    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.ok:
                resp_data = resp.json()
                break
            else:
                last_error = f"{model_name} failed ({resp.status_code}): {resp.text}"
        except Exception as e:
            last_error = str(e)

    if not resp_data:
        raise RuntimeError(f"All Gemini generation models failed. Last error: {last_error}")
    try:
        raw_text = resp_data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as err:
        raise RuntimeError(f"Unexpected response structure from Gemini: {resp_data}") from err

    # Step 5: Clean JSON formatting & Pydantic Validation
    clean_json = re.sub(r"^```json\s*", "", raw_text, flags=re.IGNORECASE)
    clean_json = re.sub(r"\s*```$", "", clean_json).strip()

    try:
        validated_response = RAGResponse.model_validate_json(clean_json)
    except Exception as parse_err:
        # Fallback parsing in case of subtle JSON quirks
        try:
            parsed = json.loads(clean_json)
            validated_response = RAGResponse(
                category=parsed.get("category", "General Civic Grievance"),
                department=parsed.get("department", "Municipal Corporation"),
                priority=parsed.get("priority", "medium"),
                petition=parsed.get("petition", raw_text),
                sources=[
                    SourceCitation(
                        title=s.get("title", "Policy Document"),
                        source=s.get("source", ""),
                        chunk_index=s.get("chunk_index", 1),
                    )
                    for s in parsed.get("sources", [])
                ] or citations_list,
            )
        except Exception:
            raise RuntimeError(f"Failed to parse and validate Gemini response: {raw_text}") from parse_err

    # Ensure citations are included if Gemini omitted them
    if not validated_response.sources and citations_list:
        validated_response.sources = citations_list

    return validated_response
