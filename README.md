# CiviBridge — AI-Powered Multilingual Civic Grievance Assistant

> An enterprise-grade, multilingual civic grievance assistant enabling citizens to draft, understand, and track municipal complaints in their regional language using **Retrieval-Augmented Generation (RAG)**, **Vector Search**, and **Google Gemini AI**.

---

## 💡 The Problem & Solution

* **The Problem**: In multilingual countries like India, millions struggle with civic portals due to language barriers and bureaucratic jargon. Most portals only accept formal legal complaints in English or official state languages.
* **The Solution**: **CiviBridge** allows citizens to submit grievances in **English, Telugu, or Hindi**. Gemini models translate and extract semantics, an in-database **Vector RAG pipeline** auto-classifies the issue against civic categories, and an **Admin Triage Portal** enables municipal officers to review, route, and resolve grievances efficiently.

---

## 🛠️ Tech Stack & Architecture

```
  ┌─────────────────────────────────────────────────────────────┐
  │                   React + Vite Frontend                     │
  │     (Citizen Grievance Portal & Admin Triage Dashboard)     │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ REST API (JWT Auth)
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 Node.js + Express Backend                   │
  │     (Controllers, Validation, RBAC, RAG Pipeline)           │
  └──────────────┬──────────────────────────────┬───────────────┘
                 │                              │
                 ▼                              ▼
  ┌─────────────────────────────┐┌──────────────────────────────┐
  │   MongoDB Atlas + Mongoose  ││    Google Gemini 2.5 &       │
  │  (Users, Grievances, Vector ││     Text Embeddings          │
  │     Embeddings Storage)     ││ (Translation & RAG Drafting) │
  └─────────────────────────────┘└──────────────────────────────┘
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Responsive UI with Citizen Portal & Admin Triage Dashboard |
| **Backend** | Node.js, Express | RESTful API server with Zod validation and RBAC middleware |
| **Database** | MongoDB Atlas, Mongoose | Cloud document store for users, grievances, and categories |
| **Vector Store** | MongoDB Vector Embeddings | Stores 768-dim Gemini embeddings directly inside category documents |
| **Similarity Engine** | Cosine Similarity | Sub-millisecond semantic retrieval matching grievances to departments |
| **AI / LLM** | Google Gemini 2.5 Flash | Neural translation and context-augmented formal grievance drafting |
| **Auth & Security** | JWT, bcrypt (12 rounds) | Role-Based Access Control (`citizen` vs. `admin`) |

---

## 📁 Clean Repository Structure

```
CiviBridge/
├── client/                     # React + Vite Single Page Application
│   ├── src/
│   │   ├── components/         # Navbar, AuthModal, CitizenPortal, AdminDashboard
│   │   ├── context/            # AuthContext (JWT state management)
│   │   └── services/           # api.js (Axios/Fetch HTTP client wrapper)
│   └── vite.config.js
├── server/                     # Node.js + Express REST API
│   ├── scripts/
│   │   └── seedMongo.js        # Seeds categories & generates Gemini embeddings
│   ├── src/
│   │   ├── controllers/        # auth, complaint, triage, and rag controllers
│   │   ├── db/                 # mongoClient.js (Mongoose connection pool)
│   │   ├── middleware/         # authMiddleware.js (JWT & Admin guards)
│   │   ├── models/             # User, Complaint, GrievanceCategory (Mongoose)
│   │   ├── rag/                # ragService.js & vectorStore.js (Semantic retrieval)
│   │   ├── routes/             # Express route endpoints
│   │   ├── services/           # translationService.js (Gemini AI integration)
│   │   ├── utils/              # embeddings.js (Vector embeddings & Cosine similarity)
│   │   ├── validators/         # Zod schemas for request validation
│   │   └── index.js            # Express server entry point
│   └── tests/                  # Automated integration test suite
├── docs/                       # Architecture and deployment documentation
├── README.md                   # Project documentation
├── .env.example                # Sample environment template
└── package.json                # Root package with npm workspaces
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* **Node.js**: `>= 20.x`
* **npm**: `>= 9.x`
* **MongoDB Atlas URI** & **Google Gemini API Key**

### 1. Installation
```bash
git clone https://github.com/Pavan-create-dot/CiviBridge.git
cd CiviBridge
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file in the root folder:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI="your-mongodb-atlas-connection-string"
JWT_SECRET="your_jwt_secret_key"
GEMINI_API_KEY="your_gemini_api_key"
ADMIN_PROVISION_SECRET="civibridge-admin-secret-2026"
```

### 3. Seed Database with Gemini Embeddings
```bash
npm run seed
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend SPA (http://localhost:3000)
npm run dev:client
```

### 5. Run Integration Tests
```bash
npm test --workspace=server
```

---

## 🎤 Interview Highlights (How to Explain this Project)

When explaining CiviBridge to an interviewer:

1. **The Core Innovation**:
   *"I built an AI-powered civic grievance platform that bridges the gap between regional Indian language speakers and bureaucratic municipal workflows using RAG."*
2. **The RAG & Vector Search Architecture**:
   *"Instead of running costly dedicated vector databases, I implemented an in-database vector architecture using MongoDB Atlas. When grievances are submitted in Telugu or Hindi, Gemini generates 768-dimensional embeddings, and our vector retrieval engine calculates cosine similarity against municipal department profiles to auto-route complaints in sub-milliseconds."*
3. **Enterprise Security & Reliability**:
   *"The backend implements Role-Based Access Control (RBAC) with JWT and bcrypt, request sanitization via Zod schemas, and automated Gemini neural translation with graceful fallbacks."*
4. **Full-Stack Polish**:
   *"Includes an Admin Triage Portal with real-time aggregation metrics, priority filtering, and resolution rate analytics."*

---

## 📄 License
Licensed under the [MIT License](LICENSE).
