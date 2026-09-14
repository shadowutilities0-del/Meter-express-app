const mongoose = require('mongoose');
const dns = require('node:dns');

// Some antivirus/security suites intercept the OS's DNS resolution and
// block SRV-type lookups (which mongodb+srv:// connection strings rely
// on), causing connection failures regardless of which network you're on.
// Pointing Node's own resolver straight at a public DNS server sidesteps
// that interception entirely.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;