const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rawText: { type: String, required: true },
    detectedLanguage: { type: String, default: 'en' },
    translatedText: { type: String, default: null },
    generatedDraft: { type: String, default: null },
    matchedCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'GrievanceCategory', default: null },
    assignedDepartment: { type: String, default: null },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    adminNotes: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'classified', 'routed', 'in_progress', 'resolved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
