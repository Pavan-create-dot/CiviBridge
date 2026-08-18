# CiviBridge System Architecture

## System Overview

CiviBridge is a decoupled full-stack web application with a React SPA frontend, an Express API backend, and a cloud MongoDB Atlas database with Gemini-powered RAG and neural translation.

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
      |  MongoDB Atlas   |  | JWT  |  |  MongoDB Vector  |
      |   (Mongoose)     |  | Auth |  |   Embeddings     |
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
- **Database Layer (`server/src/db` & `server/src/models`)**: MongoDB Atlas accessed via Mongoose ODM for users, grievances, categories, and embedding vectors.
- **Authentication Middleware (`server/src/middleware`)**: Role-Based Access Control (RBAC) via JSON Web Tokens (JWT). Citizens and admins have distinct permissions.
- **RAG & AI Module (`server/src/rag` & `services`)**: In-database 768-dim embedding vectors queried by cosine similarity. Gemini LLM generates formal complaint drafts and auto-routes complaints to departments.
