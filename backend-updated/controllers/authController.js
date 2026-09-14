const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Map various frontend value formats to the exact enum values the schema expects
const normalizeRole = (role) => {
  if (!role) return role;
  const r = role.trim().toLowerCase();
  const map = { admin: 'Admin', customer: 'Customer', user: 'Staff', staff: 'Staff' };
  return map[r] || role;
};

exports.register = async (req, res) => {
  try {
    // SECURITY: public self-registration can only ever create a Customer
    // account. Admin/Staff accounts are never created here, no matter what
    // the request body sends — that prevents anyone from just picking
    // "Admin" on the signup form and granting themselves access.
    req.body.role = 'Customer';

    const { email, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create(req.body);
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: err.message });
  }
};

// Admin-only: create a Staff or Admin account. This is the ONLY way a
// Staff/Admin account can ever be created — protected by `protect` +
// `authorize('Admin')` in authRoutes.js, so only someone already signed in
// as Admin can grant this access to someone else.
exports.createStaffOrAdmin = async (req, res) => {
  try {
    const role = normalizeRole(req.body.role);
    if (!role || !['Admin', 'Staff'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'Admin' or 'Staff'" });
    }
    req.body.role = role;

    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create(req.body);

    res.status(201).json({
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Create staff/admin error:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/forgot-password  { email }
//
// Works for Admin, Staff, and Customer accounts alike — role doesn't
// matter here, we just need to find the user by email.
//
// SECURITY: we always respond with the same success message whether or
// not the email exists in our system. If we said "email not found" for
// unknown addresses, anyone could use this endpoint to check which
// emails have an account (an "email enumeration" leak).
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (user) {
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      const html = `
        <p>You requested a password reset for your Meter Express account.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      `;

      try {
        await sendEmail({
          to: user.email,
          subject: 'Meter Express — Password Reset',
          html,
          text: `Reset your password: ${resetUrl} (expires in 15 minutes)`,
        });
      } catch (emailErr) {
        // Email failed to send — clear the token so a stale/unusable one
        // isn't left sitting on the account, then report a server error
        // rather than the generic success message.
        console.error('Send reset email error:', emailErr.message);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ message: 'Could not send reset email. Please try again later.' });
      }
    }

    res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/auth/reset-password/:resettoken  { password }
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' });
    }

    user.password = password; // re-hashed by the pre('save') hook on the model
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user);

    res.json({
      message: 'Password updated successfully.',
      token,
      user: {
        id: user._id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: err.message });
  }
};