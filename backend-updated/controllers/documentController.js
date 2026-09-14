const Document = require("../models/Document");
const Folder = require("../models/Folder");
const Application = require("../models/Application");

// POST /api/documents/upload
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { folderName, applicationRef, applicationId, uploaderName, uploaderEmail } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: "folderName is required" });
    }

    let folder = await Folder.findOne({ name: folderName.trim() });
    if (!folder) folder = await Folder.create({ name: folderName.trim() });

    let application = null;
    if (applicationId || applicationRef) {
      application = applicationId
        ? await Application.findById(applicationId)
        : await Application.findOne({ reference: applicationRef });
      if (!application) return res.status(404).json({ error: "Application not found" });
    }

    // FIX: the file used to only be written to disk (upload.js's old
    // diskStorage) with just this metadata saved here. Now the actual
    // bytes are saved straight into MongoDB as a base64 data URL, so the
    // file survives host restarts/redeploys instead of living on a disk
    // that can be wiped at any time.
    const base64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    const doc = await Document.create({
      folder: folder._id,
      folderName: folder.name,
      application: application?._id,
      applicationRef: applicationRef || undefined,
      originalName: req.file.originalname,
      data: dataUrl,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: {
        name: uploaderName || req.user?.name,
        email: uploaderEmail || req.user?.email,
        role: req.user?.role === "admin" ? "admin" : "customer",
      },
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("uploadDocument error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "That folder already exists" });
    }
    res.status(500).json({ error: err.message || "Upload failed" });
  }
};

// GET /api/documents/application/:applicationRef
exports.getDocumentsByApplication = async (req, res) => {
  try {
    const docs = await Document.find({ applicationRef: req.params.applicationRef }).sort({
      createdAt: -1,
    });

    const grouped = docs.reduce((acc, d) => {
      (acc[d.folderName] ||= []).push(d);
      return acc;
    }, {});

    res.json(grouped);
  } catch (err) {
    console.error("getDocumentsByApplication error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// GET /api/documents
exports.getAllDocuments = async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });

    const grouped = docs.reduce((acc, d) => {
      (acc[d.folderName] ||= []).push(d);
      return acc;
    }, {});

    res.json(grouped);
  } catch (err) {
    console.error("getAllDocuments error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// GET /api/documents/:id/download
// FIX: used to read the file back off disk (fs.existsSync / res.download).
// Now decodes the base64 data stored on the document itself and streams
// that back — no filesystem involved, so this keeps working even after a
// redeploy wipes any local disk.
exports.downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    if (!doc.data) return res.status(404).json({ error: "File content not available for this document" });

    const base64 = doc.data.split(",")[1] || doc.data;
    const buffer = Buffer.from(base64, "base64");

    res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.originalName}"`);
    res.send(buffer);
  } catch (err) {
    console.error("downloadDocument error:", err);
    res.status(500).json({ error: "Download failed" });
  }
};

// DELETE /api/documents/:id
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // FIX: no longer any file on disk to clean up — the content lives in
    // this same document (doc.data), so deleting the record is enough.
    await doc.deleteOne();

    res.json({ success: true });
  } catch (err) {
    console.error("deleteDocument error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};