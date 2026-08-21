const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('MONGODB_URI (or DATABASE_URL) is missing in environment variables.');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas');
}

module.exports = { connectDB };
