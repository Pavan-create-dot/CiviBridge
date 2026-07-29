# CiviBridge Architecture Specification

## 1. System Overview

CiviBridge is designed as a clean, decoupled two-sided web application. It connects citizens needing regional language grievance assistance with government department administrators responsible for resolving issues.

```
+-------------------------------------------------------------+
|                      React (Vite) SPA                       |
|          (Multilingual UI: English, Telugu, Hindi)          |
+------------------------------+------------------------------+
                               | REST API (JSON)
                               v
+-------------------------------------------------------------+
|                     Node.js + Express API                   |
|  [Controllers] -> [Services] -> [Middleware] -> [RAG]        |
+--------------+---------------+--------------+---------------+
               |               |              |
               v               v              v
      +------------------+  +------+  +------------------+
      | PostgreSQL (DB)  |  | JWT  |  | ChromaDB (Vector)|
      |  (via Prisma)    |  | Auth |  | (Semantic Search)|
      +------------------+  +------+  +------------------+
                                              |
                                              v
                                    +------------------+
                                    | Gemini AI Engine |
                                    | (RAG & Trans)    |
                                    +------------------+
```

---

## 2. Core Layers & Responsibilities

1. **Client Layer (`client/`)**: Single-page application built with React and Vite. Handles user interaction, regional language switching, grievance drafting forms, and admin triage dashboards.
2. **API Layer (`server/src/routes` & `controllers`)**: Validates incoming HTTP requests, checks JWT authorization, and delegates processing to services.
3. **Service Layer (`server/src/services`)**: Implements core business logic for user management, grievance workflows, and AI interaction.
4. **RAG Module (`server/src/rag`)**: Manages document chunking, embedding generation, ChromaDB vector querying, and Gemini prompt assembly.
5. **Data Layer (`server/src/models` & Prisma)**: Provides typed database access to PostgreSQL.

---

## 3. Key Design Constraints
- **Simplicity first**: No microservices, message queues, or enterprise message brokers.
- **Explainability**: Every architectural layer can be explained in under 2 minutes during placement interviews.
