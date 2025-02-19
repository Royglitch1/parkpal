const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['qr_scan', 'ticket_expiry', 'payment_success', 'payment_failed', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scannedLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    },
    address: String
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ scannedLocation: '2dsphere' });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;