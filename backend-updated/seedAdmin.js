// seedAdmin.js
//
// One-off script to create an Admin user directly in MongoDB, bypassing the
// normal /auth/register + createStaffOrAdmin flow (which requires an
// existing admin to already be logged in — a chicken-and-egg problem when
// there's no admin yet).
//
// USAGE:
//   1. Place this file in your backend project root (wherever your server
//      connects to MongoDB — same folder level as server.js / app.js).
//   2. Update the ADMIN_DETAILS object below with the email/password you want.
//   3. Run:  node seedAdmin.js
//   4. Delete this file afterwards (or at least change the password after
//      first login) — it contains a plaintext password and shouldn't be
//      left lying around in your repo.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // adjust path if your models folder is elsewhere

const ADMIN_DETAILS = {
  role: 'Admin',
  firstName: 'Hiren',       // change to a real name if you want
  lastName: 'parmar',
  phoneNumber: '7869456789', // required by schema — set a real one if you have it
  email: 'info@meterexpress.co.uk', // <-- CHANGE THIS to the email you want to log in with
  password: 'admin@123',          // <-- CHANGE THIS to a real password
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI); // must match the env var your server.js uses

    const existing = await User.findOne({ email: ADMIN_DETAILS.email });
    if (existing) {
      console.log(`A user with email "${ADMIN_DETAILS.email}" already exists (role: ${existing.role}).`);
      console.log('If you want to reset their password instead, use a reset script, not this one.');
      process.exit(0);
    }

    // .create() triggers the schema's pre('save') hook, which hashes the
    // password with bcrypt automatically — so we never store it in plaintext.
    const admin = await User.create(ADMIN_DETAILS);

    console.log('Admin user created successfully:');
    console.log({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
    });
    console.log('\nYou can now log in with:');
    console.log(`  email:    ${ADMIN_DETAILS.email}`);
    console.log(`  password: ${ADMIN_DETAILS.password}`);
  } catch (err) {
    console.error('Failed to create admin user:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();