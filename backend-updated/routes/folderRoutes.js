const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folderController");
const { protect } = require("../middleware/auth"); // adjust to match your export name

router.get("/", protect, folderController.getFolders);
router.post("/", protect, folderController.createFolder);
router.delete("/:id", protect, folderController.deleteFolder);

module.exports = router;