# CiviBridge Architecture

## System Overview

CiviBridge is a decoupled full-stack web application with a React SPA frontend and a Node.js Express backend.

```
+-------------------------------------------------------------+
|                      React (Vite) SPA                       |
|          (Multilingual UI: English, Telugu, Hindi)          |
+------------------------------+------------------------------+
                               | REST API (JSON)
                               v
+-------------------------------------------------------------+
|                     Node.js + Express API                   |
|  [Controllers] -> [Services] -> [Middleware] -> [RAG]       |
+--------------+---------------+--------------+---------------+
               |               |              |
               v               v              v
      +------------------+  +------+  +------------------+
      | PostgreSQL (DB)  |  | JWT  |  | PostgreSQL        |
      |  (via Prisma)    |  | Auth |  | (Embeddings)      |
      +------------------+  +------+  +------------------+
                                              |
                                              v
                                    +------------------+
                                    | Gemini AI Engine |
                                    | (RAG & Trans)    |
                                    +------------------+
```

---

## Layer Responsibilities

- **Client SPA (`client/`)**: React application built with Vite. Provides the citizen grievance drafting interface and the admin triage dashboard.
- **Server API (`server/src/index.js`)**: Express server with JWT-protected route groups for auth, complaints, translation, RAG, and triage.
- **Database Layer (`server/src/db` & `server/prisma`)**: PostgreSQL accessed via Prisma ORM for users, grievances, categories, and embedding vectors.
- **Authentication Middleware (`server/src/middleware`)**: Role-Based Access Control (RBAC) via JSON Web Tokens (JWT). Citizens and admins have distinct permissions.
- **RAG & AI Module (`server/src/rag` & `services`)**: PostgreSQL-hosted embedding vectors queried by cosine similarity. Gemini LLM generates formal complaint drafts and auto-routes complaints to departments.
