# Deployment Guide — Vercel (Frontend) & Render (Backend)

This document outlines the steps to deploy the CiviBridge frontend to Vercel and the backend to Render.

---

## 1. Frontend Deployment (Vercel)

- In the Vercel dashboard: **New Project** → Import Git Repository → Select root directory or set root to `client`.
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL` — Production URL of your deployed backend (e.g. `https://civibridge-server.onrender.com`).

---

## 2. Backend Deployment (Render)

- In the Render dashboard: **New Web Service** → Connect your GitHub repository.
- **Root Directory**: `server`
- **Build Command**: `npm install --no-audit --no-fund`
- **Start Command**: `npm start`
- **Environment Variables** (set in Render Dashboard → *Environment*):
  - `MONGODB_URI` — Your MongoDB Atlas connection string (`mongodb+srv://...`)
  - `JWT_SECRET` — Strong random secret for signing JWTs
  - `GEMINI_API_KEY` — Google Gemini AI API key
  - `ADMIN_PROVISION_SECRET` — Secret for provisioning admin accounts
  - `CORS_ORIGIN` — Your Vercel frontend URL (e.g. `https://civibridge.vercel.app`)

---

## 3. Database Seeding (MongoDB Atlas)

To seed civic grievance categories and generate Gemini embeddings:
```bash
npm run seed
```
*(Can be run once from your local machine or terminal).*

---

## 4. Security Best Practices

- Never commit real passwords, API keys, or JWT secrets to Git.
- Always use `.env` locally and cloud environment variable dashboards in production.
