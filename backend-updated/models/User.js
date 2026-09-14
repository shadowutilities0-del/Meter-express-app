const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['Admin', 'Customer', 'Staff'],
    required: true,
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },

  // Customer profile fields (used to pre-fill new applications).
  // All optional — populated later via PUT /api/customer/profile.
  companyName: { type: String, default: '' },
  companyNumber: { type: String, default: '' },
  companyPropertyNumber: { type: String, default: '' },
  companyStreetName: { type: String, default: '' },
  companyTown: { type: String, default: '' },
  companyPostcode: { type: String, default: '' },
  propertyNumber: { type: String, default: '' },
  streetName: { type: String, default: '' },
  town: { type: String, default: '' },
  postcode: { type: String, default: '' },

  // --- Password reset ---
  // We never store the raw token (same reasoning as passwords: if the DB
  // leaks, a plain token would let an attacker reset any account whose
  // email they know). Instead we store a SHA-256 hash of the token and
  // compare hashes when the user submits the token from the email link.
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generates a random reset token, stores its hash + a 15-minute expiry on
// the document (caller is responsible for calling user.save() after this),
// and returns the UNHASHED token so it can be emailed to the user.
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);