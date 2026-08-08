# CiviBridge — Project Roadmap

## Overview

CiviBridge is a multilingual civic grievance platform built with self-contained, incremental milestones.

---

### Repository Setup

- npm workspaces (`client`, `server`), ESLint, Prettier, `.env.example`, and GitHub Actions CI.

### Database Schema & Prisma

- Prisma schema with PostgreSQL models for Users, Departments, Grievances, and Audit Logs.
- Database migration scripts and Prisma client initialization.

### Authentication & User Management

- JWT authentication middleware.
- User registration and login for Citizens and Department Admins.

### Core Grievance Management API

- REST endpoints for grievance submission, retrieval, and status tracking.

### Multilingual Translation Service

- Gemini API integration for English, Telugu, and Hindi translations.

### Vector Embedding & Semantic Search

- Gemini-generated embedding vectors stored directly in PostgreSQL.
- Cosine similarity search over grievance categories without an external vector database.

### RAG Retrieval & AI Assistant Engine

- Semantic similarity retrieval layer.
- Context-augmented Gemini generation for drafting formal civic grievance petitions.

### Admin & Department Triage Portal API

- Department routing, priority assignment, and status update workflow endpoints.
- Auto-routing via RAG classification.

### React Client UI

- Multilingual citizen grievance drafting & tracking interface.
- Department administrator triage dashboard with filtering, pagination, and analytics.

### Deployment

- Production build, environment audit, and Vercel/Render deployment configurations.
