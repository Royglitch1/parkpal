const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Register new vehicle
router.post('/', authenticate, async (req, res) => {
  try {
    const { registrationNumber, registrationYear, vehicleType, make, model, color } = req.body;
    const userId = req.user.userId;

    // Check if vehicle already registered
    const existingVehicle = await Vehicle.findOne({ registrationNumber });
    if (existingVehicle) {
      return res.status(400).json({ message: 'Vehicle already registered' });
    }

    function generateUniqueThreeDigitCode() {
      // In production, you might check against a database to ensure uniqueness
      return Math.floor(100 + Math.random() * 900).toString();
    }
    const threeDigitCode = generateUniqueThreeDigitCode();
    // Generate unique identifier for QR code
    const uniqueId = crypto.randomBytes(32).toString('hex');
    
    // Generate QR code with vehicle data
    const qrCodeData = JSON.stringify({
      id: uniqueId,
      registrationNumber,
      vehicleType,
      threeDigitCode,
      timestamp: Date.now()
    });
    
    const qrCode = await QRCode.toDataURL(qrCodeData);

    const vehicle = new Vehicle({
      owner: userId,
      registrationNumber: registrationNumber.toUpperCase(),
      registrationYear,
      vehicleType,
      make,
      model,
      color,
      qrCode
    });

    await vehicle.save();

    // Add vehicle to user's vehicles array
    await User.findByIdAndUpdate(userId, {
      $push: { vehicles: vehicle._id }
    });

    res.status(201).json({
      message: 'Vehicle registered successfully',
      vehicle
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering vehicle', error: error.message });
  }
});

// Get user's vehicles
router.get('/', authenticate, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.userId })
      .populate({
        path: 'tickets',
        options: { sort: { createdAt: -1 }, limit: 5 }
      });

    res.json({ vehicles });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicles', error: error.message });
  }
});

// Get vehicle by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user.userId
    }).populate('tickets');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ vehicle });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vehicle', error: error.message });
  }
});

// Get QR code for vehicle
router.get('/:id/qr', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Generate QR code with vehicle data
    const qrCodeData = JSON.stringify({
      id: vehicle.qrCode,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      timestamp: Date.now()
    });
    
    const qrCode = await QRCode.toDataURL(qrCodeData);

    res.json({
      qrCode,
      vehicleId: vehicle._id,
      registrationNumber: vehicle.registrationNumber
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
});

// Update vehicle
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { color } = req.body;
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Only allow updating certain fields
    if (color) vehicle.color = color;

    await vehicle.save();
    res.json({
      message: 'Vehicle updated successfully',
      vehicle
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating vehicle', error: error.message });
  }
});

// Delete vehicle
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user.userId
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Remove vehicle from user's vehicles array
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { vehicles: vehicle._id }
    });

    // Soft delete by setting isActive to false
    vehicle.isActive = false;
    await vehicle.save();

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vehicle', error: error.message });
  }
});

module.exports = router;