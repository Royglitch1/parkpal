const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { authenticate } = require('../middleware/auth');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, mobileNumber } = req.body;

    // Validate required fields
    if (!email || !password || !name || !mobileNumber) {
      return res.status(400).json({
        message: 'All fields are required',
        errors: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null,
          name: !name ? 'Name is required' : null,
          mobileNumber: !mobileNumber ? 'Mobile number is required' : null
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
        error: 'INVALID_EMAIL'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long',
        error: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { mobileNumber }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'mobileNumber';
      return res.status(400).json({
        message: `This ${field} is already registered`,
        error: 'DUPLICATE_USER',
        field
      });
    }

    // Generate QR code
    const uniqueId = crypto.randomBytes(32).toString('hex');
    const threeDigitCode = Math.floor(100 + Math.random() * 900).toString();
    
    const qrCodeData = JSON.stringify({
      id: uniqueId,
      code: threeDigitCode,
      timestamp: Date.now()
    });
    
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    // Create new user with QR code
    const newUser = new User({
      email,
      password,
      name,
      mobileNumber,
      qrCode: qrCodeImage
    });

    try {
      await newUser.save();
    } catch (dbError) {
      console.error('Database error during user creation:', dbError);
      if (dbError.name === 'ValidationError') {
        return res.status(400).json({
          message: 'Validation error',
          error: 'VALIDATION_ERROR',
          details: Object.keys(dbError.errors).reduce((acc, key) => {
            acc[key] = dbError.errors[key].message;
            return acc;
          }, {})
        });
      }
      throw dbError;
    }

    // Validate JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({
        message: 'Server configuration error',
        error: 'CONFIG_ERROR'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        mobileNumber: newUser.mobileNumber,
        role: newUser.role,
        qrCode: newUser.qrCode
      }
    });
  } catch (error) {
    console.error('Registration error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle specific error types
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        // Extract the duplicate key field from the error message
        const field = error.message.includes('email') ? 'email' : 
                     error.message.includes('mobileNumber') ? 'mobileNumber' : 'unknown';

        const errorMessages = {
          email: 'This email is already registered',
          mobileNumber: 'This mobile number is already registered',
          unknown: 'A record with this information already exists'
        };

        return res.status(400).json({
          message: errorMessages[field],
          error: 'DUPLICATE_KEY_ERROR',
          field
        });
      }
      return res.status(500).json({
        message: 'Database error occurred',
        error: 'DB_ERROR'
      });
    }

    res.status(500).json({
      message: 'An unexpected error occurred during registration',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Add input validation first
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        error: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Validate JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({
        message: 'Server configuration error',
        error: 'CONFIG_ERROR'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        qrCode: user.qrCode
      }
    });
  } catch (error) {
    console.error('Login error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({
        message: 'Database error occurred',
        error: 'DB_ERROR'
      });
    }

    res.status(500).json({
      message: 'An unexpected error occurred during login',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('vehicles')
      .populate({
        path: 'notifications',
        options: {
          sort: { createdAt: -1 },
          limit: 10
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, mobileNumber } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only update fields that are provided
    if (name) user.name = name;
    if (mobileNumber) user.mobileNumber = mobileNumber;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        qrCode: user.qrCode
      }
    });
  } catch (error) {
    console.error('Profile update error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userId: req.user.userId
    });

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        error: 'VALIDATION_ERROR',
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        return res.status(400).json({
          message: 'Mobile number is already in use',
          error: 'DUPLICATE_MOBILE'
        });
      }
      return res.status(500).json({
        message: 'Database error occurred',
        error: 'DB_ERROR'
      });
    }

    res.status(500).json({
      message: 'An unexpected error occurred while updating profile',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

module.exports = router;