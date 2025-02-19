const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
  
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Required for Twilio IVR

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/parkpal')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/vehicles', require('./routes/vehicle.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/tickets', require('./routes/ticket.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/ivr', require('./routes/ivr.routes')); // IVR routes

// TODO: Implement these routes later
// app.use('/api/qr', require('./routes/qr.routes'));
// app.use('/api/admin', require('./routes/admin.routes'));
// app.use('/api/payments', require('./routes/payment.routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});