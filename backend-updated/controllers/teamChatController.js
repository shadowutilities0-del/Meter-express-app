const TeamMessage = require('../models/TeamMessage');

// GET /api/team-messages
exports.getTeamMessages = async (req, res) => {
  try {
    const messages = await TeamMessage.find().sort({ time: 1 });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/team-messages
exports.addTeamMessage = async (req, res) => {
  try {
    const { author, role, text } = req.body;
    const message = await TeamMessage.create({ author, role, text });
    res.status(201).json({ message });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
