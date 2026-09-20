from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import PORT, EMBEDDING_MODEL, GENERATION_MODEL, GEMINI_API_KEY, ALLOWED_ORIGINS
from database import get_db, get_chunks_collection
from models import IndexDocumentRequest, GeneratePetitionRequest, RAGResponse
from rag_engine import index_document, delete_document_chunks, generate_petition_rag

app = FastAPI(
    title="CiviBridge AI & RAG Microservice",
    version="1.0.0",
    description="Dedicated GenAI microservice for regional language civic grievance drafting, chunking, and MongoDB Atlas Vector Search.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    mongo_status = "connected"
    chunk_count = 0
    try:
        db = get_db()
        db.command("ping")
        chunk_count = get_chunks_collection().count_documents({})
    except Exception as e:
        mongo_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "service": "CiviBridge FastAPI RAG Service",
        "mongodb": mongo_status,
        "total_document_chunks": chunk_count,
        "gemini_api_configured": bool(GEMINI_API_KEY),
        "models": {
            "embedding": EMBEDDING_MODEL,
            "generation": GENERATION_MODEL,
        }
    }

@app.post("/knowledge/index")
def index_knowledge_document(req: IndexDocumentRequest):
    try:
        num_chunks = index_document(
            document_id=req.document_id,
            title=req.title,
            content=req.content,
            source=req.source or "",
            category=req.category or "policy",
        )
        return {
            "message": f"Successfully chunked and embedded {num_chunks} vector chunks.",
            "document_id": req.document_id,
            "chunks_indexed": num_chunks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@app.delete("/knowledge/{document_id}")
def delete_knowledge_document_chunks(document_id: str):
    try:
        deleted_count = delete_document_chunks(document_id)
        return {
            "message": f"Deleted {deleted_count} chunks for document {document_id}",
            "chunks_deleted": deleted_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document chunks: {str(e)}")

@app.post("/rag/generate", response_model=RAGResponse)
def generate_petition(req: GeneratePetitionRequest):
    try:
        response = generate_petition_rag(
            grievance=req.grievance,
            language=req.language,
            categories=req.categories,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
