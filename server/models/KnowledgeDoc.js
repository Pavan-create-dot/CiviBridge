const mongoose = require('mongoose');

const knowledgeDocSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    source: { type: String, default: '', trim: true },
    category: { type: String, default: 'policy', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeDoc', knowledgeDocSchema);
