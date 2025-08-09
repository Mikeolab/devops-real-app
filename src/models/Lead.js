const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  service: { type: String, enum: ['crypto', 'giftcard', 'webdev', 'seo'], required: true },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
