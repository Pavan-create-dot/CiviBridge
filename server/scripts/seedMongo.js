// MongoDB seed script — seeds GrievanceCategory data and generates Gemini embeddings for semantic search.
// Run with: npm run seed or node scripts/seedMongo.js

const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_PATH || path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDB, disconnectDB } = require('../src/db/mongoClient');
const GrievanceCategory = require('../src/models/GrievanceCategory');
const { embedText } = require('../src/utils/embeddings');

const categories = [
  {
    categoryName: 'Road & Pothole Repair',
    department: 'Municipal Roads Department',
    description:
      'Issues related to damaged roads, potholes, broken footpaths, and road surface deterioration affecting public safety and commute.',
    language: 'en',
  },
  {
    categoryName: 'Water Supply & Drainage',
    department: 'Water Supply Board',
    description:
      'Complaints about irregular water supply, contaminated drinking water, broken pipelines, open drains, and sewage overflow.',
    language: 'en',
  },
  {
    categoryName: 'Electricity & Street Lights',
    department: 'Electricity Distribution Department',
    description:
      'Issues with power outages, faulty street lights, exposed wiring, transformer failures, and irregular electricity supply.',
    language: 'en',
  },
  {
    categoryName: 'Garbage & Waste Management',
    department: 'Sanitation & Solid Waste Department',
    description:
      'Complaints about uncollected garbage, overflowing bins, illegal dumping, poor sanitation, and lack of waste disposal facilities.',
    language: 'en',
  },
  {
    categoryName: 'Public Property Encroachment',
    department: 'Town Planning & Encroachment Cell',
    description:
      'Illegal construction on public land, encroachment on footpaths, parks or open spaces, and obstruction of public access routes.',
    language: 'en',
  },
  {
    categoryName: 'Health & Sanitation',
    department: 'Public Health Department',
    description:
      'Issues related to mosquito breeding, stagnant water, open defecation, unhygienic public toilets, and disease outbreak risks.',
    language: 'en',
  },
  {
    categoryName: 'Tree Felling & Environment',
    department: 'Urban Forest & Environment Department',
    description:
      'Complaints about illegal tree cutting, fallen trees blocking roads, deforestation, and environmental violations in urban areas.',
    language: 'en',
  },
  {
    categoryName: 'Noise & Air Pollution',
    department: 'Pollution Control Board',
    description:
      'Grievances about excessive noise from construction or events, vehicle pollution, factory emissions, and burning of waste materials.',
    language: 'en',
  },
  {
    categoryName: 'Public Transport & Traffic',
    department: 'Transport Department',
    description:
      'Issues with public bus services, auto-rickshaw overcharging, traffic congestion, broken traffic signals, and poor road signage.',
    language: 'en',
  },
  {
    categoryName: 'Birth, Death & Document Certificates',
    department: 'Civil Registration & Records Office',
    description:
      'Delays or errors in issuing birth certificates, death certificates, caste certificates, and other civic documentation.',
    language: 'en',
  },
];

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();

  console.log('Seeding GrievanceCategory data and generating Gemini embeddings...');

  for (const cat of categories) {
    const textToEmbed = `${cat.categoryName}: ${cat.description}`;
    console.log(`  Generating embedding for: ${cat.categoryName}...`);
    const embedding = await embedText(textToEmbed);

    await GrievanceCategory.findOneAndUpdate(
      { categoryName: cat.categoryName },
      { ...cat, embedding },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const count = await GrievanceCategory.countDocuments();
  console.log(`Successfully seeded ${count} grievance categories in MongoDB Atlas!`);
}

seed()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDB();
    process.exit(0);
  });
