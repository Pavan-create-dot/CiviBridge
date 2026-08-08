// CiviBridge — Express server entry point

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
// CORS — In production set CORS_ORIGIN to your Vercel frontend URL.
// Falls back to wildcard (*) in development for convenience.
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
  credentials: true,
};
app.use(cors(corsOptions));
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

app.use('/auth', authRoutes);
app.use('/complaints', complaintRoutes);
app.use('/translate', translationRoutes);
app.use('/rag', ragRoutes);
app.use('/triage', triageRoutes);

// ── Start ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CiviBridge API running on port ${PORT}`);
  });
}

module.exports = app;
