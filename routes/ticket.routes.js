const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const Ticket = require('../models/ticket.model');
const Vehicle = require('../models/vehicle.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');

// Create support ticket
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      subject,
      description,
      category,
      priority,
      vehicleId
    } = req.body;

    const ticketData = {
      user: req.user.userId,
      subject,
      description,
      category,
      priority: priority || 'medium'
    };

    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        _id: vehicleId,
        owner: req.user.userId
      });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      ticketData.vehicle = vehicleId;
    }

    const ticket = new Ticket(ticketData);
    await ticket.save();

    // Create notification for admin
    const notification = new Notification({
      user: req.user.userId,
      type: 'system',
      title: 'New Support Ticket',
      message: `A new support ticket has been created: ${subject}`,
      ticket: ticket._id
    });

    await notification.save();

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating ticket', error: error.message });
  }
});

// Get user's tickets
router.get('/my-tickets', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const query = { user: req.user.userId };
    if (status) {
      query.status = status;
    }

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('vehicle', 'registrationNumber vehicleType')
      .populate('assignedTo', 'name')
      .populate('comments.user', 'name');

    const total = await Ticket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

// Get ticket by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name email')
      .populate('vehicle', 'registrationNumber vehicleType')
      .populate('assignedTo', 'name')
      .populate('comments.user', 'name')
      .populate('resolution.resolvedBy', 'name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is authorized to view ticket
    if (ticket.user.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json({ ticket });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ticket', error: error.message });
  }
});

// Add comment to ticket
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user is authorized
    if (ticket.user.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to comment on this ticket' });
    }

    ticket.comments.push({
      user: req.user.userId,
      content
    });

    await ticket.save();

    // Create notification for ticket owner or admin
    const notificationUser = req.user.role === 'admin' ? ticket.user : await User.findOne({ role: 'admin' });
    const notification = new Notification({
      user: notificationUser,
      type: 'system',
      title: 'New Ticket Comment',
      message: `New comment on ticket: ${ticket.subject}`,
      ticket: ticket._id
    });

    await notification.save();

    res.json({
      message: 'Comment added successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
});

// Update ticket status (Admin only)
router.patch('/:id/status', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = status;
    if (status === 'resolved' && resolution) {
      ticket.resolution = {
        content: resolution,
        resolvedBy: req.user.userId,
        resolvedAt: new Date()
      };
    }

    await ticket.save();

    // Create notification for ticket owner
    const notification = new Notification({
      user: ticket.user._id,
      type: 'system',
      title: 'Ticket Status Updated',
      message: `Your ticket "${ticket.subject}" has been marked as ${status}`,
      ticket: ticket._id
    });

    await notification.save();

    res.json({
      message: 'Ticket status updated successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating ticket status', error: error.message });
  }
});

// Assign ticket to admin (Admin only)
router.patch('/:id/assign', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { adminId } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Verify admin exists
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    ticket.assignedTo = adminId;
    await ticket.save();

    // Create notification for assigned admin
    const notification = new Notification({
      user: adminId,
      type: 'system',
      title: 'Ticket Assigned',
      message: `You have been assigned to ticket: ${ticket.subject}`,
      ticket: ticket._id
    });

    await notification.save();

    res.json({
      message: 'Ticket assigned successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning ticket', error: error.message });
  }
});

module.exports = router;