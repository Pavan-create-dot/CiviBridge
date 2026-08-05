// CiviBridge — Express server entry point
// Phase 7: RAG routes wired in.

// Allow overriding the env file path for test runs via DOTENV_PATH
require('dotenv').config({ path: process.env.DOTENV_PATH || '../.env' });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const translationRoutes = require('./routes/translationRoutes');
const ragRoutes = require('./routes/ragRoutes');
const triageRoutes = require('./routes/triageRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
// Health check — confirms the server is reachable
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CiviBridge Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Auth — register and login
app.use('/auth', authRoutes);

// Complaints — grievance submission and tracking
app.use('/complaints', complaintRoutes);

// Translation — multilingual text translation and language detection
app.use('/translate', translationRoutes);

// RAG — vector category search and context-augmented complaint drafting assistant
app.use('/rag', ragRoutes);

// Triage — Phase 8: Admin & Department Triage Portal API
app.use('/triage', triageRoutes);

// ── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CiviBridge API running on port ${PORT}`);
  });
}

module.exports = app;
