const Folder = require("../models/Folder");

// GET /api/folders
exports.getFolders = async (req, res) => {
  try {
    const folders = await Folder.find().sort({ name: 1 });
    res.json(folders);
  } catch (err) {
    console.error("getFolders error:", err);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
};

// POST /api/folders
exports.createFolder = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Folder name is required" });

    const existing = await Folder.findOne({ name });
    if (existing) return res.status(400).json({ error: "Folder already exists" });

    const folder = await Folder.create({
      name,
      // FIX: JWT payload is { id, role }, not { _id, role } — req.user._id
      // was always undefined. createdBy now actually saves.
      createdBy: req.user?.id,
    });
    res.status(201).json(folder);
  } catch (err) {
    // FIX: this was silently swallowed before — nothing printed to the
    // terminal, so the real cause (bad Mongo URI, validation error,
    // duplicate index, etc.) was invisible. Now it logs AND returns the
    // real message so the frontend can show you what actually broke.
    console.error("createFolder error:", err);
    res.status(500).json({ error: err.message || "Failed to create folder" });
  }
};

// DELETE /api/folders/:id  (admin only — blocks delete if documents exist)
exports.deleteFolder = async (req, res) => {
  try {
    const Document = require("../models/Document");
    const inUse = await Document.exists({ folder: req.params.id });
    if (inUse) {
      return res.status(400).json({ error: "Cannot delete a folder that has documents in it" });
    }
    await Folder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteFolder error:", err);
    res.status(500).json({ error: "Failed to delete folder" });
  }
};