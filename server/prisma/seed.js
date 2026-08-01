// Prisma seed script — Phase 2 scaffold
// Grievance category data will be populated in a later phase.
// Run with: npx prisma db seed

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Seed data will be added here in a future phase.
  console.log('Seed script ran — no data to insert yet.');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
