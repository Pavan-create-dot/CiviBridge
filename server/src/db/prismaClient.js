// Prisma client singleton
// Reusing a single PrismaClient instance prevents connection pool exhaustion
// in long-running Node processes and during hot-reload development.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
