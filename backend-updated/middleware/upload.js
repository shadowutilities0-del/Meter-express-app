const multer = require('multer');

// FIX: this used to be multer.diskStorage(), writing every upload to the
// local filesystem under uploads/<ref>/<folder>/... — fine on a machine
// that keeps its disk between restarts, but most hosts (Render, Railway,
// etc.) wipe that disk on every redeploy, silently losing every file while
// MongoDB still "remembers" the document existed. Switched to memory
// storage: the file arrives in req.file.buffer, and documentController.js
// now saves that buffer into MongoDB itself (as a base64 data URL) instead
// of writing anything to disk.
//
// Limit dropped from 25MB to 8MB — a base64-encoded file is ~1.37x its
// original size, and MongoDB caps a single document at 16MB. 8MB in stays
// comfortably under that after encoding, with room for the rest of the
// document's fields.
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});