const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authController = require('../controllers/authController');
const authentication = require('../middleware/adminAuth');

// ✅ Register Route
router.post('/register', async (req, res) => {
  const { name, email, phone, password, freeFireUsername
   } = req.body;

  try {
    if (!name || !email || !phone || !password || !freeFireUsername) {
      return res.status(400).json({ 
        status: false,
        message: 'All fields are required' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        status: false,
        message: 'Email already in use' 
      });
    }

    const user = new User({
      name,
      email,
      phone,
      password, // plain text – will be hashed in pre('save')
      freeFireUsername,
    });

    await user.save();

    res.status(201).json({
      status: true,
      message: 'User registered successfully',
      // user: {
      //   name: user.name,
      //   email: user.email,
      //   phone: user.phone,
      //   wallet: user.wallet,
      //   freeFireUsername: user.freeFireUsername,
      //   isAdmin: user.isAdmin
      // }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      status: false,
      message: 'Server error occurred during registration. Please try again.' 
    });
  }
});

// ✅ Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ 
      status: false,
      message: 'Email and password are required' 
    });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ 
        status: false,
        message: 'Invalid credentials' 
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ 
        status: false,
        message: 'Invalid credentials' 
      });

    // ✅ Create JWT token with userId
    const token = jwt.sign({ userId: user._id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    });

    res.json({
      status: true,
      message: 'Login successful',
      token,
      // user: {
      //   name: user.name,
      //   token
      // }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      status: false,
      message: 'Server error occurred during login. Please try again.' 
    });
  }
});

router.get('/users', authentication, authentication.authorizationRole('admin'), authController.getAllUsers);

router.get('/user', authentication, authController.getUserByQuery);

// ✅ OTP Handling
router.post('/verify', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

module.exports = router;
