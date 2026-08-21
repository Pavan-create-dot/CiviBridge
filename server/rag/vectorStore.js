const GrievanceCategory = require('../models/GrievanceCategory');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const { embedText, cosineSimilarity } = require('./embeddings');

// Find top matching categories for query text
async function findSimilarCategories(queryText, topK = 3) {
  const queryEmbedding = await embedText(queryText);
  const categories = await GrievanceCategory.find({
    embedding: { $exists: true, $not: { $size: 0 } },
  }).lean();

  if (categories.length === 0) return [];

  return categories
    .map((cat) => ({
      category: cat,
      score: cosineSimilarity(queryEmbedding, cat.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Find top matching knowledge docs for query text
async function findSimilarKnowledgeDocs(queryText, topK = 3) {
  const queryEmbedding = await embedText(queryText);
  const docs = await KnowledgeDoc.find({
    embedding: { $exists: true, $not: { $size: 0 } },
  }).lean();

  if (docs.length === 0) return [];

  return docs
    .map((doc) => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { findSimilarCategories, findSimilarKnowledgeDocs };
