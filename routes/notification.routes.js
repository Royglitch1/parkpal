const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/notification.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('scannedBy', 'name')
      .populate('vehicle', 'registrationNumber');

    const total = await Notification.countDocuments({ user: req.user.userId });

    res.json({
      notifications,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticate, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

// Handle QR code scan
router.post('/scan/:qrCode', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    const scannedBy = req.user.userId;
    
    // Find vehicle by QR code
    const vehicle = await Vehicle.findOne({ qrCode: req.params.qrCode })
      .populate('owner', 'name email');

    if (!vehicle) {
      return res.status(404).json({ message: 'Invalid QR code' });
    }

    // Create scan notification
    const notification = new Notification({
      user: vehicle.owner._id,
      type: 'qr_scan',
      title: 'Vehicle QR Code Scanned',
      message: `Your vehicle (${vehicle.registrationNumber}) was scanned`,
      scannedBy,
      vehicle: vehicle._id,
      scannedLocation: {
        type: 'Point',
        coordinates: [longitude, latitude],
        address
      }
    });

    await notification.save();

    // Add notification to user's notifications
    await User.findByIdAndUpdate(vehicle.owner._id, {
      $push: { notifications: notification._id }
    });

    res.json({
      message: 'QR code scanned successfully',
      vehicle: {
        registrationNumber: vehicle.registrationNumber,
        vehicleType: vehicle.vehicleType,
        owner: vehicle.owner.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing QR scan', error: error.message });
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Remove notification from user's notifications array
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { notifications: notification._id }
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

module.exports = router;