const express = require('express');
const router = express.Router();
const User = require('../models/user.model');
const { authenticate } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('vehicles')
      .populate('notifications');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email, mobileNumber } = req.body;
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (email) updateFields.email = email.toLowerCase();
    if (mobileNumber) updateFields.mobileNumber = mobileNumber;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or mobile number already exists' });
    }
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Delete user account
router.delete('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { isActive: false },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Account deactivated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating account', error: error.message });
  }
});

// Admin routes
// Get all users (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find()
      .select('-password')
      .populate('vehicles')
      .populate('notifications');
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get specific user by ID (admin only)
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('vehicles')
      .populate('notifications');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

// Update user status (admin only)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    res.status(500).json({ message: 'Error updating user status', error: error.message });
  }
});

module.exports = router;