from typing import List, Optional
from pydantic import BaseModel, Field

class IndexDocumentRequest(BaseModel):
    document_id: str = Field(..., description="Parent KnowledgeDoc MongoDB ID")
    title: str = Field(..., description="Title of the document")
    content: str = Field(..., description="Full text content to be chunked")
    source: Optional[str] = Field(default="", description="Source or reference URL/manual")
    category: Optional[str] = Field(default="policy", description="Policy category")

class GrievanceCategoryItem(BaseModel):
    id: Optional[str] = None
    name: str
    department: str
    description: str

class GeneratePetitionRequest(BaseModel):
    grievance: str = Field(..., min_length=3, description="Citizen's problem description")
    language: str = Field(default="en", description="Target language: en, te, or hi")
    categories: List[GrievanceCategoryItem] = Field(default_factory=list, description="Allowed municipal categories")

class SourceCitation(BaseModel):
    title: str
    source: str
    chunk_index: int

class RAGResponse(BaseModel):
    category: str = Field(..., description="Matched civic grievance category")
    department: str = Field(..., description="Assigned municipal department")
    priority: str = Field(default="medium", description="Triage priority: low, medium, high, urgent")
    petition: str = Field(..., description="Official formal grievance petition body")
    sources: List[SourceCitation] = Field(default_factory=list, description="Retrieved knowledge document chunks used as context")
