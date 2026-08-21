const mongoose = require('mongoose');

const knowledgeDocSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    category: { type: String, default: 'policy', trim: true },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeDoc', knowledgeDocSchema);
