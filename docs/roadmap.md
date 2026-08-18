# CiviBridge — Project Roadmap & Capabilities

## Overview

CiviBridge is a multilingual civic grievance platform built with modern full-stack practices and AI orchestration.

---

### 1. Repository Architecture
- Modular npm workspaces (`client`, `server`), ESLint, Prettier, `.env.example`, and GitHub Actions CI.

### 2. Database & Data Modeling
- MongoDB Atlas cloud document database with Mongoose ODM.
- Scalable schemas for `User`, `Complaint`, and `GrievanceCategory`.

### 3. Authentication & RBAC
- Secure JWT authentication with bcrypt password hashing (12 salt rounds).
- Distinct permission roles for Citizens and Municipal Department Administrators.

### 4. Core Grievance Management API
- REST endpoints for grievance submission, user tracking, and administrative status lifecycle management.

### 5. Multilingual Translation Service
- Google Gemini API integration for real-time neural translations across English, Telugu, and Hindi.

### 6. Vector Embeddings & Semantic Search
- 768-dimensional Gemini dense vector representations stored directly in MongoDB documents.
- In-database Cosine Similarity retrieval engine without external vector database dependencies.

### 7. RAG Engine & Petition Drafting
- Context-augmented generation using Gemini 2.5 Flash.
- Automated municipal department auto-routing and AI-assisted formal grievance petition drafting.

### 8. Admin & Department Triage Portal
- Triage dashboard featuring real-time aggregation metrics, priority filtering, and audit logs.

### 9. Modern React Client
- Multilingual citizen grievance drafting & tracking interface.
- Department administrator triage dashboard with filtering, pagination, and analytics.
