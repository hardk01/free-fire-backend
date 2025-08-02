const User = require('../models/User');
// const sendOTP = require('../utils/sendOTP');
// const jwt = require('jsonwebtoken');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// exports.register = async (req, res) => {
//   try {
//     const { fullName, email, mobile, gamingName, gamingUID, password } = req.body;
//     let user = await User.findOne({ email });
//     if (user) return res.status(400).json({ msg: 'User already exists' });
//     user = new User({ fullName, email, mobile, gamingName, gamingUID, password, isVerified: true });
//     await user.save();
//     res.status(201).json({ msg: 'Registered. You can now log in.' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'Already verified' });

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ msg: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    if (!user.isVerified) return res.status(400).json({ msg: 'Please verify your email first' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    // Return dummy token
    res.json({ token: 'dummy-token', user: { id: user._id, fullName: user.fullName, email: user.email, walletBalance: user.walletBalance } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifyOTP = async (req, res) => {
  res.json({ msg: 'Email verified. You can now log in.' });
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'User already verified' });

    const newOtp = generateOTP();
    user.otp = newOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();
    await sendOTP(email, newOtp);

    res.json({ msg: 'OTP resent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // hide password

    res.status(200).json({ users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
