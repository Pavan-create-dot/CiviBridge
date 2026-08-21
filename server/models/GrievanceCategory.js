const mongoose = require('mongoose');

const grievanceCategorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  embedding: { type: [Number], default: [] },
});

module.exports = mongoose.model('GrievanceCategory', grievanceCategorySchema);
