# CiviBridge — AI-powered Regional Language Civic Grievance Assistant

> An AI-powered multilingual civic grievance assistant that helps citizens draft, understand, and track government grievances in their preferred language using semantic retrieval and large language models.

---

## 🎯 Tech Stack

| Layer | Choice | One-sentence purpose |
|---|---|---|
| Frontend | React + Vite | Fast, reactive user interface for citizens and admins |
| Backend | Node.js + Express | RESTful API server handling request routing and AI orchestration |
| Database | PostgreSQL + Prisma | Relational store for users, grievances, and department data |
| Auth | JWT | Identifies user roles (Citizen / Department Admin) and permissions |
| Vector Store | ChromaDB | Stores vector embeddings for semantic document search (RAG) |
| Embeddings | Single Embedding Model | Converts civic policy documents into dense vector representations |
| LLM | Gemini | Generates contextual grievance drafts and responses |
| Translation | Gemini | Translates text seamlessly between English, Telugu, and Hindi |
| Deployment | Vercel (Client) + Render (Server) + Supabase (Postgres) | Cloud hosting without managing raw server infrastructure |

---

## 🏗️ Simplified System Architecture

```
React (Vite)
  ↓
Node.js + Express API
  ↓
Service Layer
  ↓
RAG Module
  ↓
Vector Database (ChromaDB)
  ↓
PostgreSQL (Prisma ORM)
```

---

## 📁 Repository Structure

```
CiviBridge/
├── client/                     # React + Vite Single Page Application
├── server/                     # Node.js + Express REST API
│   └── src/
│       ├── config/             # Environment & DB configurations
│       ├── controllers/        # Express request controllers
│       ├── middleware/         # Auth, validation, error handlers
│       ├── models/             # Prisma data access layer
│       ├── rag/                # RAG retrieval & vector store integration
│       ├── routes/             # REST endpoint route definitions
│       ├── services/           # Business logic & LLM service layer
│       └── utils/              # Shared helper functions
├── docs/
│   ├── architecture.md         # System design & architectural principles
│   └── roadmap.md              # Phase-by-phase implementation roadmap
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI workflow
├── README.md                   # Project overview & documentation
├── PROJECT_STATUS.md           # Milestone progress & tech debt tracking
├── .env.example                # Sample environment configuration template
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: `v18.x` or later
- **npm**: `v9.x` or later

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/CiviBridge.git
   cd CiviBridge
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```

4. **Run Development Servers:**
   - Client: `npm run dev:client` (runs on http://localhost:3000)
   - Server: `npm run dev:server` (runs on http://localhost:5000)

---

## 🧪 Quality Check Commands

```bash
# Run linting across client and server
npm run lint

# Build client for production
npm run build
```
