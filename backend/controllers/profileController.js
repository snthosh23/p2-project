const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');
const Report = require('../models/Report');

// @desc    Get current user profile
// @route   GET /api/profile
// @access  Protected
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};

// @desc    Update user profile or settings
// @route   PUT /api/profile
// @access  Protected
const updateProfile = async (req, res) => {
  try {
    const { name, email, password, accounts, settings } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) {
      // Check if email already taken
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== req.userId) {
        return res.status(400).json({ success: false, message: 'Email already taken by another account' });
      }
      user.email = email;
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (accounts) {
      user.accounts = accounts;
    }

    if (settings) {
      user.settings = {
        ...user.settings,
        ...settings
      };
    }

    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        accounts: user.accounts,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// @desc    Purge all user transaction and budget ledger data
// @route   DELETE /api/profile/purge
// @access  Protected
const purgeData = async (req, res) => {
  try {
    await Transaction.deleteMany({ userId: req.userId });
    await Budget.deleteMany({ userId: req.userId });
    await Notification.deleteMany({ userId: req.userId });
    await Report.deleteMany({ userId: req.userId });

    res.json({ success: true, message: 'All ledger transactions, budgets and notifications purged successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error purging ledger parameters' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  purgeData
};
