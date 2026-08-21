const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_PATH || path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const ragRoutes = require('./routes/rag');
const translateRoutes = require('./routes/translate');
const knowledgeRoutes = require('./routes/knowledge');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'CiviBridge Backend API', time: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/complaints', complaintRoutes);
app.use('/rag', ragRoutes);
app.use('/translate', translateRoutes);
app.use('/knowledge', knowledgeRoutes);

// Start server
if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`CiviBridge API running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('Failed to connect DB:', err);
      process.exit(1);
    });
}

module.exports = app;
