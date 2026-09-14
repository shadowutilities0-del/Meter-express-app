const express = require('express');
const router = express.Router();
const { getTeamMessages, addTeamMessage } = require('../controllers/teamChatController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('Admin', 'Staff'));

router.get('/', getTeamMessages);
router.post('/', addTeamMessage);

module.exports = router;
