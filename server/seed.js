const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_PATH || path.resolve(__dirname, '../.env') });

const { connectDB } = require('./db');
const GrievanceCategory = require('./models/GrievanceCategory');
const KnowledgeDoc = require('./models/KnowledgeDoc');
const { embedText } = require('./rag/embeddings');

const categories = [
  {
    categoryName: 'Road & Pothole Repair',
    department: 'Municipal Roads Department',
    description: 'Issues related to damaged roads, potholes, broken footpaths, and road surface deterioration affecting public safety and commute.',
  },
  {
    categoryName: 'Water Supply & Drainage',
    department: 'Water Supply Board',
    description: 'Complaints about irregular water supply, contaminated drinking water, broken pipelines, open drains, and sewage overflow.',
  },
  {
    categoryName: 'Electricity & Street Lights',
    department: 'Electricity Distribution Department',
    description: 'Issues with power outages, faulty street lights, exposed wiring, transformer failures, and irregular electricity supply.',
  },
  {
    categoryName: 'Garbage & Waste Management',
    department: 'Sanitation & Solid Waste Department',
    description: 'Complaints about uncollected garbage, overflowing bins, illegal dumping, poor sanitation, and lack of waste disposal facilities.',
  },
  {
    categoryName: 'Public Property Encroachment',
    department: 'Town Planning & Encroachment Cell',
    description: 'Illegal construction on public land, encroachment on footpaths, parks or open spaces, and obstruction of public access routes.',
  },
  {
    categoryName: 'Health & Sanitation',
    department: 'Public Health Department',
    description: 'Issues related to mosquito breeding, stagnant water, open defecation, unhygienic public toilets, and disease outbreak risks.',
  },
  {
    categoryName: 'Tree Felling & Environment',
    department: 'Urban Forest & Environment Department',
    description: 'Complaints about illegal tree cutting, fallen trees blocking roads, deforestation, and environmental violations in urban areas.',
  },
  {
    categoryName: 'Noise & Air Pollution',
    department: 'Pollution Control Board',
    description: 'Grievances about excessive noise from construction or events, vehicle pollution, factory emissions, and burning of waste materials.',
  },
  {
    categoryName: 'Public Transport & Traffic',
    department: 'Transport Department',
    description: 'Issues with public bus services, auto-rickshaw overcharging, traffic congestion, broken traffic signals, and poor road signage.',
  },
  {
    categoryName: 'Birth, Death & Document Certificates',
    department: 'Civil Registration & Records Office',
    description: 'Delays or errors in issuing birth certificates, death certificates, caste certificates, and other civic documentation.',
  },
];

const knowledgeDocs = [
  {
    title: 'Municipal Public Grievance Petition Filing Format Guidelines',
    category: 'petition-guidelines',
    content: 'According to Municipal Grievance Rules, every citizen petition must clearly specify: 1. Petitioner details & contact address. 2. Specific location of the civic hazard (ward number, landmark, street name). 3. Nature and duration of the problem. 4. Immediate public safety risk or inconvenience caused. 5. Explicitly requested action from the authority.',
  },
  {
    title: 'Section 44 - Citizens Right to Public Infrastructure Safety',
    category: 'legal-framework',
    content: 'Under Section 44 of the Urban Local Bodies Act, municipal officers are obligated to inspect reported public infrastructure damages (potholes, open drains, water leaks) within 48 hours of filing. Urgent hazards impacting public safety must be barricaded immediately and repaired within 7 working days.',
  },
  {
    title: 'Sanitation & Solid Waste Disposal Mandate',
    category: 'sanitation-rules',
    content: 'The Solid Waste Management Rules dictate daily collection of household waste and immediate clearing of public garbage dumps near educational institutions, hospitals, and residential areas. Stagnant water and waste overflow must be treated with disinfectant spraying by the Public Health division.',
  },
  {
    title: 'Water Supply Pipeline Maintenance Protocol',
    category: 'water-department-rules',
    content: 'Clean drinking water is a fundamental civic right. Complaints regarding main pipeline bursts or contamination must be prioritized under Category A (Urgent). The Water Supply Board is mandated to deploy emergency repair tankers and complete pipe restoration within 24 hours of notification.',
  },
  {
    title: 'Street Lighting & Public Safety Standards',
    category: 'electricity-rules',
    content: 'Streetlights on major public thoroughfares, school zones, and residential lanes must maintain 100% operational status. Reported dark spots or non-functional LED fixtures must be rectified by the Electricity Department within 3 business days to prevent nighttime crimes and accidents.',
  },
];

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();

  console.log('Seeding Grievance Categories with Gemini vector embeddings...');
  for (const cat of categories) {
    const textToEmbed = `${cat.categoryName}: ${cat.description}`;
    console.log(`  Embedding category: ${cat.categoryName}...`);
    let embedding = [];
    try {
      embedding = await embedText(textToEmbed);
    } catch (e) {
      console.warn(`  Warning embedding category ${cat.categoryName}:`, e.message);
    }
    await GrievanceCategory.findOneAndUpdate(
      { categoryName: cat.categoryName },
      { ...cat, embedding },
      { upsert: true, new: true }
    );
  }

  console.log('Seeding Grounding Knowledge Base Docs with Gemini vector embeddings...');
  for (const doc of knowledgeDocs) {
    const textToEmbed = `${doc.title}: ${doc.content}`;
    console.log(`  Embedding knowledge doc: ${doc.title}...`);
    let embedding = [];
    try {
      embedding = await embedText(textToEmbed);
    } catch (e) {
      console.warn(`  Warning embedding knowledge doc ${doc.title}:`, e.message);
    }
    await KnowledgeDoc.findOneAndUpdate(
      { title: doc.title },
      { ...doc, embedding },
      { upsert: true, new: true }
    );
  }

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
