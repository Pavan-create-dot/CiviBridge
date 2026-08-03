// CiviBridge — Express server entry point
// Phase 7: RAG routes wired in.

require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const translationRoutes = require('./routes/translationRoutes');
const ragRoutes = require('./routes/ragRoutes');

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

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CiviBridge API running on port ${PORT}`);
});
