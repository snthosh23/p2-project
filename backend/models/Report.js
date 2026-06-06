const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  month: {
    type: String,
    required: [true, 'Please specify the month (YYYY-MM format)'],
    match: [/^\d{4}-\d{2}$/, 'Please use YYYY-MM format']
  },
  totalIncome: {
    type: Number,
    default: 0
  },
  totalExpense: {
    type: Number,
    default: 0
  },
  savings: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

ReportSchema.index({ month: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Report', ReportSchema);
