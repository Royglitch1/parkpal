const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const User = require('../models/user.model');
const Vehicle = require('../models/vehicle.model');
const Ticket = require('../models/ticket.model');

// Get dashboard statistics
router.get('/dashboard', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalVehicles,
      totalTickets,
      activeTickets,
      todayTickets,
      pendingPayments
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Vehicle.countDocuments({ isActive: true }),
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'active' }),
      Ticket.countDocuments({
        createdAt: { $gte: today }
      }),
      Ticket.countDocuments({ paymentStatus: 'pending' })
    ]);

    const recentTickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vehicle', 'registrationNumber')
      .populate('user', 'name email');

    res.json({
      statistics: {
        totalUsers,
        totalVehicles,
        totalTickets,
        activeTickets,
        todayTickets,
        pendingPayments
      },
      recentTickets
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

// Get all users (with pagination and filters)
router.get('/users', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;

    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('vehicles');

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

// Get user details
router.get('/users/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('vehicles')
      .populate({
        path: 'notifications',
        options: { sort: { createdAt: -1 }, limit: 10 }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's tickets
    const tickets = await Ticket.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('vehicle');

    res.json({
      user,
      tickets
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error: error.message });
  }
});

// Update user status
router.patch('/users/:id/status', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot modify admin user status' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status', error: error.message });
  }
});

// Get system statistics
router.get('/statistics', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'week';
    const today = new Date();
    let startDate;

    switch (timeframe) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      default:
        startDate = new Date(today.setDate(today.getDate() - 7));
    }

    const statistics = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          ticketCount: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'completed'] },
                '$amount',
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({ statistics });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

module.exports = router;