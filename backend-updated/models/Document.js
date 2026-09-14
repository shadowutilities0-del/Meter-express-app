const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: true },
  folderName: { type: String, required: true }, // denormalized for easy grouping
  originalName: String,
  // FIX: files used to only be written to disk (uploads/<ref>/<folder>/...)
  // with just this metadata saved to Mongo. Most hosts (Render, Railway,
  // etc.) wipe that disk on every restart/redeploy, silently losing every
  // uploaded file while the database still "remembers" it existed. `data`
  // now holds the actual file content as a base64 data URL
  // (e.g. "data:application/pdf;base64,JVBERi0..."), so the file survives
  // in MongoDB itself — same pattern already used for Application
  // documents. fileName/filePath are kept only so older records (saved
  // before this change) don't break; new uploads no longer use them.
  fileName: String,
  filePath: String,
  data: String,
  mimeType: String,
  size: Number,
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  applicationRef: { type: String, index: true }, // e.g. "APP-1046"
  uploadedBy: {
    name: String,
    email: String,
  },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);