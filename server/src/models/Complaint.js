// Complaint Model — Citizen civic grievances
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rawText: {
      type: String,
      required: true,
      trim: true,
    },
    detectedLanguage: {
      type: String,
      required: true,
    },
    translatedText: {
      type: String,
      default: null,
    },
    matchedCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GrievanceCategory',
      default: null,
    },
    assignedDepartment: {
      type: String,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    adminNotes: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'classified', 'routed', 'in_progress', 'resolved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Ensure populated fields also alias id
        if (ret.matchedCategoryId && typeof ret.matchedCategoryId === 'object') {
          ret.matchedCategory = {
            id: ret.matchedCategoryId._id ? ret.matchedCategoryId._id.toString() : ret.matchedCategoryId.id,
            categoryName: ret.matchedCategoryId.categoryName,
            department: ret.matchedCategoryId.department,
            description: ret.matchedCategoryId.description,
          };
        }
        if (ret.userId && typeof ret.userId === 'object') {
          ret.user = {
            id: ret.userId._id ? ret.userId._id.toString() : ret.userId.id,
            email: ret.userId.email,
            role: ret.userId.role,
          };
        }
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

// Populate helper
complaintSchema.virtual('matchedCategory', {
  ref: 'GrievanceCategory',
  localField: 'matchedCategoryId',
  foreignField: '_id',
  justOne: true,
});

complaintSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
