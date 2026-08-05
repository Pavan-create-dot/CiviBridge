# Deployment Guide — Vercel (frontend) & Render (backend)

This document outlines the minimal steps to deploy the CiviBridge frontend to Vercel and the backend to Render.

Frontend (Vercel)
- Recommended: Deploy the `client/` folder as a Vercel project.
- In the Vercel dashboard: "New Project" → Import Git Repository → select the `client` folder.
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment variables: none required for the static client, but if you call the backend API, set `VITE_API_URL` in Vercel if needed.

Alternatively, from the root you can add a Vercel project that runs `npm run build --workspace=client` and serves `client/dist`.

Backend (Render)
- Create a new Web Service on Render and connect your GitHub repository.
- Use the `render.yaml` manifest (root of repo) if you want Render to auto-provision the service from the manifest.
- Build Command: `cd server && npm ci`
- Start Command: `cd server && npm start`
- Required environment variables (set these in Render's dashboard `Environment` tab):
  - `DATABASE_URL` — Postgres connection string
  - `JWT_SECRET` — strong secret for signing JWTs
  - `GEMINI_API_KEY` — (optional) to enable Gemini translation/embeddings
  - `ADMIN_PROVISION_SECRET` — secret for provisioning admin accounts (do NOT use default in production)

Prisma migrations & seeding
- After provisioning the Render service, run migrations and seed data in Render's dashboard or via a post-deploy hook:

```
cd server
npx prisma migrate deploy
npm run prisma:seed || node prisma/seed.js
```

Notes & security
- Never commit production secrets to the repository. Use Render's environment variables UI or Vercel's Environment Variables.
- For local testing, copy `.env.example` to `.env` and fill in values.
