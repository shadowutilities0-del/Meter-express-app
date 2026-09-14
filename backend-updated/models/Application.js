const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    channel: { type: String, enum: ['customer', 'internal'], required: true },
    author: { type: String, required: true },
    role: { type: String, default: '' },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: String, default: '' },
    uploadedBy: { type: String, default: '' },
    folder: { type: String, default: '' },
    // Base64 data URL (e.g. "data:image/png;base64,....") holding the
    // actual file content. Fine for small/medium attachments; if uploads
    // grow large or frequent, move this to GridFS or an object store
    // (S3/R2) instead of storing bytes inline on the application doc.
    data: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const NoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    author: { type: String, required: true },
    role: { type: String, default: '' },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InfoRequestSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    askedAt: { type: Date, default: Date.now },
    response: { type: String, default: null },
    respondedAt: { type: Date, default: null },
  },
  { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true },
    // Owner links the application back to the customer account that created
    // it, so /api/applications can be filtered per-customer.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, required: true },
    utility: { type: String, required: true },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String, required: true },
    property: { type: String, default: '' },
    postcode: { type: String, default: '' },
    submittedDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    status: {
      type: String,
      enum: [
        'Pending Review',
        'In Progress',
        'Request More Information',
        'Quote Issued',
        'Completed',
        'Rejected',
        'Application Cancelled',
      ],
      default: 'Pending Review',
    },
    assignedStaff: { type: String, default: null },
    infoRequest: { type: InfoRequestSchema, default: null },
    documents: { type: [DocumentSchema], default: [] },
    notes: { type: [NoteSchema], default: [] },
    messages: { type: [MessageSchema], default: [] },

    // Extra fields the New Application form collects.
    phone: { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyNumber: { type: String, default: '' },
    companyPropertyNumber: { type: String, default: '' },
    companyStreetName: { type: String, default: '' },
    companyTown: { type: String, default: '' },
    companyPostcode: { type: String, default: '' },
    companyAddress: { type: String, default: '' },
    propertyNumber: { type: String, default: '' },
    streetName: { type: String, default: '' },
    town: { type: String, default: '' },
    workDescription: { type: String, default: '' },
    documentCount: { type: Number, default: 0 },
    notesCount: { type: Number, default: 0 },
  },
  // strict: false so any additional ad-hoc field the frontend form ever
  // sends (without a matching schema field above) is still saved instead
  // of silently dropped — keeps the backend future-proof against small
  // frontend tweaks. Note: this only applies at the top level; nested
  // sub-schemas (like DocumentSchema above) must declare their own fields
  // explicitly, which is why `data` is declared there directly.
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('Application', ApplicationSchema);