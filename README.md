# CiviBridge — Regional Language Civic Grievance Assistant

CiviBridge is a full-stack Web application built with **React, Node.js (Express), MongoDB Atlas, and Google Gemini AI**. It enables citizens to file civic grievances in their native regional languages (Telugu, Hindi, English) and uses **Retrieval-Augmented Generation (RAG)** to classify, ground, and generate official government petition documents ready for PDF download.

---

## 🚀 Key Features & Project Flow

### 1. Citizen Portal
- **Native Language Description**: Citizens describe their problem in English, Telugu, or Hindi.
- **RAG Classification & Grounding**:
  1. If non-English input is provided, Gemini translates it into English.
  2. **Dual Retrieval**: Text embedding vector is computed using Gemini (`text-embedding-004`) and compared via **Cosine Similarity** against:
     - `GrievanceCategory` embeddings stored in MongoDB (finds responsible municipal department).
     - `KnowledgeDoc` embeddings stored in MongoDB (retrieves official government rules & petition format requirements).
  3. **Augment & Generate**: Gemini LLM drafts a formal, structured petition in the user's requested language.
- **Download Official PDF**: Citizens can directly preview and download a formatted official petition document as a PDF file.

### 2. Department Admin Portal
- **RAG Knowledge Base Management**: Admin can add, update, or delete government policy documents. Any new document is automatically embedded via Gemini and stored in MongoDB to ground future complaints.
- **Grievance Triage**: Admin can view all filed grievances, run AI vector auto-routing, update priority levels, change status (`pending`, `in_progress`, `resolved`), and log inspection remarks.

---

## 🏗️ Architecture & RAG Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG PIPELINE FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. EMBED (Gemini API)                                      │
│     User input text  ─────────►  768-dim Vector             │
│                                                             │
│  2. RETRIEVE (MongoDB Vector Search)                        │
│     Vector  ──► Cosine Similarity against MongoDB Docs:     │
│                 • GrievanceCategories  (Dept Routing)       │
│                 • KnowledgeDocs        (Grounding Rules)    │
│                                                             │
│  3. AUGMENT (Prompt Construction)                           │
│     System Prompt + Retrieved Context + Citizen Input      │
│                                                             │
│  4. GENERATE (Gemini LLM)                                   │
│     Output: Formal Grounded Grievance Petition             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
CiviBridge/
├── .env                  # MongoDB URI, JWT secret, Gemini API Key
├── render.yaml           # Backend deployment manifest for Render
├── README.md             # Project presentation & guide
├── package.json          # Launch controller
│
├── client/               # React + Vite Frontend
│   ├── index.html        # Includes html2pdf.js for PDF downloads
│   ├── vercel.json       # Vercel deployment config
│   └── src/
│       ├── components/   # CitizenPortal, AdminDashboard, Navbar, AuthModal
│       ├── context/      # AuthContext
│       └── services/     # API fetch wrapper
│
└── server/               # Node.js + Express Backend
    ├── db.js             # MongoDB Mongoose connection
    ├── seed.js           # Seeds categories & knowledge base with embeddings
    ├── index.js          # Express server entry point
    ├── models/           # User, Complaint, GrievanceCategory, KnowledgeDoc
    ├── middleware/       # Auth & Admin check middleware
    ├── routes/           # auth, complaints, rag, translate, knowledge
    └── rag/              # embeddings.js, vectorStore.js, ragService.js
```

---

## 🛠️ Setup & Running Locally

### Prerequisites
- Node.js (v18 or v20+)
- MongoDB Atlas cluster URL
- Google Gemini API Key

### 1. Environment Setup
Create `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI="your_mongodb_atlas_uri"
JWT_SECRET="civibridge_secret_key"
GEMINI_API_KEY="your_gemini_api_key"
ADMIN_PROVISION_SECRET="civibridge-admin-secret-2026"
```

### 2. Install Dependencies & Seed Database
```bash
# Install root, server, and client dependencies
cd server && npm install
cd ../client && npm install
cd ..

# Seed MongoDB with categories and knowledge docs (embeds via Gemini)
npm run seed
```

### 3. Run Application
```bash
# Terminal 1: Run Backend API Server
npm run dev:server

# Terminal 2: Run Frontend Client
npm run dev:client
```
Client runs on `http://localhost:3000`, Backend API runs on `http://localhost:5000`.

---

## 🎤 Interview Presentation Points (TCS / Technical Interview)

1. **Why RAG?**
   - Traditional LLMs may hallucinate department names or write unstructured letters. RAG grounds the model output using real department scopes and government guidelines retrieved directly from MongoDB.
2. **Where are embeddings stored?**
   - Stored directly in MongoDB Atlas (`embedding: [Number]`). Cosine similarity search is executed in Node.js to find the top matching category and grounding rules.
3. **How does admin knowledge update work?**
   - When an admin updates or adds a policy document in the Admin Portal, the server generates a new embedding via Gemini API and saves it in MongoDB. The next citizen complaint automatically retrieves this updated policy rule.
