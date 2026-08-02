-- Phase 6: replace chromaDocId with a float array for storing Gemini embeddings
-- stored directly in PostgreSQL — no external vector DB required

ALTER TABLE "GrievanceCategory" DROP COLUMN IF EXISTS "chromaDocId";
ALTER TABLE "GrievanceCategory" ADD COLUMN "embedding" DOUBLE PRECISION[] NOT NULL DEFAULT '{}';
