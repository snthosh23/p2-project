const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    default: 'fa-tag'
  },
  type: {
    type: String,
    enum: ['income', 'expense', 'both'],
    default: 'both'
  }
});

// Avoid duplicate category names
CategorySchema.index({ name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);
