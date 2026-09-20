const mongoose = require('mongoose');

const grievanceCategorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, trim: true, unique: true },
    department: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GrievanceCategory', grievanceCategorySchema);
