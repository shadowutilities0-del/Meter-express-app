const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth"); // adjust to match your export name

router.post("/upload", protect, upload.single("file"), documentController.uploadDocument);
router.get("/", protect, documentController.getAllDocuments);
router.get("/application/:applicationRef", protect, documentController.getDocumentsByApplication);
router.get("/:id/download", protect, documentController.downloadDocument);
router.delete("/:id", protect, documentController.deleteDocument);

module.exports = router;