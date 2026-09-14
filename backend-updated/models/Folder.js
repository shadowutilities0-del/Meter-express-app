const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isDefault: { type: Boolean, default: false }, // e.g. "ID Proof" seeded by you
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);