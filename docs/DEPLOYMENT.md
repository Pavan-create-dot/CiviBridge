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
- The manifest now deploys from the `server/` folder with `rootDir: server`.
- Build Command: `npm install`
- Start Command: `npm start`
- Required environment variables (set these in Render's dashboard `Environment` tab):
  - `DATABASE_URL` — Postgres connection string
  - `JWT_SECRET` — strong secret for signing JWTs
  - `GEMINI_API_KEY` — (optional) to enable Gemini translation/embeddings
  - `ADMIN_PROVISION_SECRET` — secret for provisioning admin accounts (do NOT use default in production)

> Note: Do not leave `envVars` with blank values in `render.yaml`. Set these values manually in Render's dashboard or via the Render API.

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

Automated helper scripts
-------------------------

Two PowerShell helper scripts are included to simplify deployment from a development machine:

- `scripts/deploy/vercel-deploy.ps1` — builds the `client` (Vite) and deploys to Vercel using the `VERCEL_TOKEN` environment variable. This uses `npx vercel` under the hood.
- `scripts/deploy/render-deploy.ps1` — posts environment variables to an existing Render service (uses `RENDER_API_KEY` and `RENDER_SERVICE_ID`) and triggers a new deploy.

Prerequisites:

- Install Vercel CLI (optional): `npm i -g vercel` (the scripts use `npx vercel` so global install is not required).
- PowerShell (Windows) or pwsh available on your PATH.

Usage example (PowerShell):

```powershell
# export sensitive values in your shell (do NOT paste secrets into chat)
$env:VERCEL_TOKEN = '...'
$env:RENDER_API_KEY = '...'
$env:RENDER_SERVICE_ID = 'srv-xxxxx'
$env:DATABASE_URL = 'postgresql://user:pass@host:port/db'
$env:JWT_SECRET = 'replace-with-strong-secret'
$env:GEMINI_API_KEY = '...'
$env:ADMIN_PROVISION_SECRET = '...'

# deploy backend to Render (sets env vars and triggers deploy)
pwsh .\scripts\deploy\render-deploy.ps1

# deploy frontend to Vercel
pwsh .\scripts\deploy\vercel-deploy.ps1
```

These scripts are convenience helpers — review them before running in production and ensure secrets are stored and exported securely.

