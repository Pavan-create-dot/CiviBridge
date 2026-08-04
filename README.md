# CiviBridge — AI-powered Regional Language Civic Grievance Assistant

> An AI-powered multilingual civic grievance assistant that helps citizens draft, understand, and track government grievances in their preferred language using semantic retrieval and large language models.

---

## ❓ Problem Statement

In multilingual nations like India, millions of citizens struggle to navigate bureaucratic civic grievance portals due to language barriers and complex legal jargon. Most grievance portals only accept formal complaints in English or state official languages, leaving citizens unable to effectively articulate issues or track resolution statuses.

**CiviBridge** bridges this gap by enabling citizens to draft, understand, and submit grievances in their native regional language (Telugu, Hindi, English). Using Retrieval-Augmented Generation (RAG) and Gemini AI, CiviBridge translates regional complaints into formal bureaucratic drafts while giving department administrators structured tools to triage, route, and resolve grievances efficiently.

---

## 🎯 Tech Stack & Purpose

| Layer              | Choice                  | One-sentence purpose                                                |
| ------------------ | ----------------------- | ------------------------------------------------------------------- |
| **Frontend**       | React + Vite            | Fast, reactive user interface for citizens and department admins.   |
| **Backend**        | Node.js + Express       | RESTful API server handling request routing and AI orchestration.   |
| **Database**       | PostgreSQL + Prisma ORM | Relational store for users, grievances, and department triage data. |
| **Authentication** | JWT                     | Identifies user roles (Citizen / Department Admin) and permissions. |
| **Vector Store**   | ChromaDB                | Stores vector embeddings for semantic document search (RAG).        |
| **Embeddings**     | Single Embedding Model  | Converts civic policy documents into dense vector representations.  |
| **LLM**            | Gemini                  | Generates contextual grievance drafts and structured responses.     |
| **Translation**    | Gemini                  | Translates text seamlessly between English, Telugu, and Hindi.      |

---

## 📁 Repository Structure

```
CiviBridge/
├── client/                     # React + Vite Single Page Application
├── server/                     # Node.js + Express REST API
│   ├── prisma/                 # Prisma ORM schema & migrations (Phase 2)
│   └── src/
│       ├── config/             # DB & environment configurations
│       ├── controllers/        # Express request controllers
│       ├── db/                 # Prisma client instance & DB helpers
│       ├── middleware/         # Auth & request middleware
│       ├── rag/                # RAG retrieval & vector store integration
│       ├── routes/             # REST endpoint route definitions
│       ├── services/           # Business logic & LLM service layer
│       ├── utils/              # Shared helper functions
│       ├── validators/         # Request input validation schemas
│       └── index.js            # Express server entry point
├── docs/
│   ├── architecture.md         # System design & layer specifications
│   └── roadmap.md              # Phase-by-phase implementation roadmap
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI workflow
├── README.md                   # Project overview & quickstart guide
├── PROJECT_STATUS.md           # Milestone progress & phase tracker
├── .editorconfig               # Line ending & indentation formatting rules
├── .prettierrc                 # Code formatting rules
├── .env.example                # Sample environment configuration template
├── .gitignore                  # Git ignore rules
└── package.json                # Root package with npm workspaces
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites

- **Node.js**: `v18.x` or later
- **npm**: `v9.x` or later

### Installation & Run

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

4. **Start Development Servers:**
   - **Client SPA:** `npm run dev:client` (runs on http://localhost:3000)
   - **Backend API:** `npm run dev:server` (runs on http://localhost:5000)

---

## 📜 Available Scripts

Run commands from the root directory:

- `npm run dev:client` — Launches Vite React development server.
- `npm run dev:server` — Launches Express server with nodemon auto-reload.
- `npm run lint` — Runs ESLint across `client` and `server` workspaces.
- `npm run build` — Bundles the React application for production.
- `npm run format` — Formats codebase using Prettier.

---

## 🗺️ Implementation Roadmap Summary

- **Phase 1: Repository Setup** ✅ _(Completed)_
- **Phase 2: Database Schema & Prisma Setup** ✅ _(Completed)_
- **Phase 3: Authentication & User Management** ✅ _(Completed)_
- **Phase 4: Core Grievance API** ✅ _(Completed)_
- **Phase 5: Multilingual Translation Service** ✅ _(Completed)_
- **Phase 6: ChromaDB Vector Store Integration** ✅ _(Completed)_
- **Phase 7: RAG Retrieval & Gemini Integration** ✅ _(Completed)_
- **Phase 8: Admin Triage Portal API** ✅ _(Completed)_
- **Phase 9: React Client Core UI** ⏳ _(Next)_
- **Phase 10: E2E Polish & Deployment** ⏳

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
