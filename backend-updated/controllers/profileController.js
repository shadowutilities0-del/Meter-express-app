const User = require('../models/User');

const PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'companyName',
  'companyNumber',
  'companyPropertyNumber',
  'companyStreetName',
  'companyTown',
  'companyPostcode',
  'propertyNumber',
  'streetName',
  'town',
  'postcode',
];

function toProfile(user) {
  return {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phone: user.phoneNumber || '',
    companyName: user.companyName || '',
    companyNumber: user.companyNumber || '',
    companyPropertyNumber: user.companyPropertyNumber || '',
    companyStreetName: user.companyStreetName || '',
    companyTown: user.companyTown || '',
    companyPostcode: user.companyPostcode || '',
    propertyNumber: user.propertyNumber || '',
    streetName: user.streetName || '',
    town: user.town || '',
    postcode: user.postcode || '',
  };
}

// GET /api/customer/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ profile: toProfile(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/customer/profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = {};
    // Frontend profile uses "phone"; the User schema stores "phoneNumber".
    if (req.body.phone !== undefined) updates.phoneNumber = req.body.phone;
    for (const key of Object.keys(req.body)) {
      if (key === 'phone') continue;
      if (['firstName', 'lastName', 'email', 'companyName', 'companyNumber', 'companyPropertyNumber',
           'companyStreetName', 'companyTown', 'companyPostcode', 'propertyNumber', 'streetName',
           'town', 'postcode'].includes(key)) {
        updates[key] = req.body[key];
      }
    }
    const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ profile: toProfile(user) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: err.message });
  }
};
