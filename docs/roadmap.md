# CiviBridge Milestone Roadmap

## Overview
CiviBridge is built phase-by-phase. Each phase is self-contained and focuses on a single deliverable.

---

### Phase 1: Repository Setup (Current)
- Scaffolding `client/` and `server/` directories.
- Setting up ESLint, Prettier, `.gitignore`, and `.env.example`.
- Establishing GitHub Actions CI pipeline.

### Phase 2: Database Schema & Prisma Setup
- Define PostgreSQL schema for Users, Grievances, Departments, and Audit Logs.
- Configure Prisma ORM models and initial migrations.

### Phase 3: Authentication & Role-Based Access Control
- Express JWT authentication middleware.
- Citizen and Department Admin signup/login endpoints.

### Phase 4: Core Grievance Management API
- CRUD endpoints for filing, retrieving, and updating grievance status.

### Phase 5: Multilingual & Gemini Translation Service
- Integration with Gemini API for translation between English, Telugu, and Hindi.

### Phase 6: Vector Database & ChromaDB Setup
- ChromaDB container/service setup and collection initialization.
- Document ingestion pipeline for civic policy documentation.

### Phase 7: RAG Retrieval & AI Assistant Engine
- Vector search retrieval layer.
- Context-augmented Gemini generation for drafting civic grievances.

### Phase 8: Admin & Department Triage Portal API
- Department routing, priority assignment, and status updates.

### Phase 9: React Client Frontend
- Citizen grievance filing & tracking UI.
- Department admin dashboard UI.

### Phase 10: Final Verification & Deployment
- E2E testing, polish, and Vercel/Render deployment configurations.
