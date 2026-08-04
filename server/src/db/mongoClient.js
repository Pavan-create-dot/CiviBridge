// MongoDB connection helper using Mongoose
// Manages the connection pool and lifecycle for MongoDB Atlas.

const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB Atlas using MONGODB_URI from environment variables.
 */
async function connectDB() {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('MongoDB connection URI (MONGODB_URI or DATABASE_URL) is not defined.');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`Connected to MongoDB Atlas: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

/**
 * Disconnect from MongoDB (useful for test teardown and graceful shutdown).
 */
async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB.');
  }
}

module.exports = { connectDB, disconnectDB, mongoose };
