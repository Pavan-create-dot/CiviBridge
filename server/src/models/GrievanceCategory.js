// GrievanceCategory Model — Civic categories for classification & semantic search
const mongoose = require('mongoose');

const grievanceCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      enum: ['en', 'te', 'hi'],
      default: 'en',
    },
    embedding: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

const GrievanceCategory =
  mongoose.models.GrievanceCategory ||
  mongoose.model('GrievanceCategory', grievanceCategorySchema);

module.exports = GrievanceCategory;
