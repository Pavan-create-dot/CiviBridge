// Reusable Prisma include shapes for complaint queries, so every endpoint
// returns the same related-entity fields.

const CATEGORY_SUMMARY_INCLUDE = {
  matchedCategory: {
    select: { categoryName: true, department: true },
  },
};

const TRIAGE_INCLUDE = {
  user: {
    select: { id: true, email: true },
  },
  matchedCategory: {
    select: { id: true, categoryName: true, department: true },
  },
};

module.exports = { CATEGORY_SUMMARY_INCLUDE, TRIAGE_INCLUDE };
