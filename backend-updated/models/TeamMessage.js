const mongoose = require('mongoose');

const TeamMessageSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },
    role: { type: String, default: '' },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: 'time', updatedAt: false } }
);

module.exports = mongoose.model('TeamMessage', TeamMessageSchema);
