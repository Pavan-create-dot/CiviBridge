const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_PATH || path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./db');

const authRoutes = require('./routes/auth');
const grievanceRoutes = require('./routes/grievances');
const ragRoutes = require('./routes/rag');
const translateRoutes = require('./routes/translate');
const knowledgeRoutes = require('./routes/knowledge');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

// Socket.IO Setup (Progressive Enhancement)
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
});

io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.split(' ')[1]);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
    } catch {
      // Invalid token, proceed as unauthenticated socket
    }
  }
  next();
});

io.on('connection', (socket) => {
  if (socket.user) {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === 'admin') {
      socket.join('admins');
    }
  }

  socket.on('disconnect', () => {
    // Clean socket disconnect
  });
});

app.set('io', io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'CiviBridge Backend API', time: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/grievances', grievanceRoutes);
app.use('/complaints', grievanceRoutes); // Backward compatibility alias
app.use('/rag', ragRoutes);
app.use('/translate', translateRoutes);
app.use('/knowledge', knowledgeRoutes);

// Start server
if (require.main === module) {
  connectDB()
    .then(() => {
      server.listen(PORT, () => console.log(`CiviBridge API & Socket.IO running on port ${PORT}`));
    })
    .catch((err) => {
      console.error('Failed to connect DB:', err);
      process.exit(1);
    });
}

module.exports = { app, server };
