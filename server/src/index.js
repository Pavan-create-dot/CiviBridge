// CiviBridge — Express server entry point
// Phase 3: Auth routes wired in; health check retained.

require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

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

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`CiviBridge API running on port ${PORT}`);
});
