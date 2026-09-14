require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const teamChatRoutes = require('./routes/teamChatRoutes');
const profileRoutes = require('./routes/profileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const documentRoutes = require('./routes/documentRoutes');
require('./services/emailService'); // <-- added: runs the Gmail connection check on startup

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/team-messages', teamChatRoutes);
app.use('/api/customer/profile', profileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
  res.send('Gas App API is running');
});

// Catch-all 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Central error handler (catches anything thrown/rejected that wasn't
// already handled inside a controller's try/catch)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));