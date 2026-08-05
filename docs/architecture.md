# CiviBridge Architecture Specification

## 1. Current System Implementation (Phase 1)

In Phase 1, CiviBridge consists of a clean, decoupled baseline repository structure with client and server entry points.

```
+-------------------------------------------------------------+
|                      React (Vite) SPA                       |
|                 [client/src/App.jsx]                        |
+------------------------------+------------------------------+
                               | HTTP REST (/api/health)
                               v
+-------------------------------------------------------------+
|                     Node.js + Express API                   |
|                 [server/src/index.js]                       |
+-------------------------------------------------------------+
```

### Current Active Components

1. **Client SPA (`client/`)**: Minimal React application built with Vite, serving the basic UI scaffold.
2. **Server API (`server/src/index.js`)**: Express server exposing `/api/health` returning JSON status.

---

## 2. Planned System Components (Future Phases)

The full system architecture will incrementally integrate the following planned modules in future phases:

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
    | PostgreSQL (DB)  |  | JWT  |  | PostgreSQL (embeddings)|
      |  (via Prisma)    |  | Auth |  | (Semantic Search)|
      +------------------+  +------+  +------------------+
                                              |
                                              v
                                    +------------------+
                                    | Gemini AI Engine |
                                    | (RAG & Trans)    |
                                    +------------------+
```

### Planned Layer Responsibilities

- **Database Layer (`server/src/db` & `server/prisma`)** _(Phase 2)_: PostgreSQL database accessed via Prisma ORM for users, grievances, and department data.
- **Authentication Middleware (`server/src/middleware`)** _(Phase 3)_: Role-Based Access Control (RBAC) via JSON Web Tokens (JWT).
-- **RAG & AI Module (`server/src/rag` & `services`)** _(Phase 6-7)_: PostgreSQL-hosted embedding vectors and Gemini LLM prompt generation.
