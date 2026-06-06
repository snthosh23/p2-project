const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Please add a category']
  },
  amount: {
    type: Number,
    required: [true, 'Please set a budget limit']
  },
  month: {
    type: String,
    required: [true, 'Please specify the month (YYYY-MM format)'],
    match: [/^\d{4}-\d{2}$/, 'Please use YYYY-MM format']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Avoid duplicate budgets for same category, month, and user
BudgetSchema.index({ category: 1, month: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
