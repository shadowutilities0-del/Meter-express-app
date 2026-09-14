const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  createStaffOrAdmin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Only a signed-in Admin can create a Staff or Admin account — this is how
// an Admin "gives permission" to someone else to become Staff/Admin.
router.post('/create-staff', protect, authorize('Admin'), createStaffOrAdmin);

// Password reset — open to anyone (that's the point: it's for people who
// can't log in), works the same for Admin, Staff, and Customer accounts.
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

module.exports = router;