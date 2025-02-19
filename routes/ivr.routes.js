const express = require('express');
const router = express.Router();
const { twiml: { VoiceResponse } } = require('twilio');
const User = require('../models/user.model');

// Step 1: Welcome endpoint to gather 3-digit code
router.post('/welcome', async (req, res) => {
  const response = new VoiceResponse();

  // Gather 3 digits from the caller
  const gather = response.gather({
    action: '/ivr/menu',
    numDigits: '3',  // expecting a 3-digit code
    method: 'POST'
  });

  gather.say('Welcome to our service. Please enter your 3 digit code.');
  
  // If no input, redirect back to welcome
  response.redirect('/ivr/welcome');

  res.type('text/xml');
  res.send(response.toString());
});

// Step 2: Process the gathered digits and route the call
router.post('/menu', async (req, res) => {
  const digits = req.body.Digits;
  const response = new VoiceResponse();

  try {
    // Find user by QR code that contains this code
    const users = await User.find();
    const user = users.find(u => {
      try {
        const qrData = JSON.parse(u.qrCode);
        return qrData.code === digits;
      } catch (e) {
        return false;
      }
    });

    if (user && user.mobileNumber) {
      // Connect the call to the user's mobile number
      response.say('Please hold while we connect your call.');
      // Make sure the mobile number starts with +
      const formattedNumber = user.mobileNumber.startsWith('+') ? 
        user.mobileNumber : 
        '+' + user.mobileNumber;
      response.dial(formattedNumber);
    } else {
      // If code is invalid, prompt again
      response.say('Invalid code entered.');
      response.redirect('/ivr/welcome');
    }
  } catch (error) {
    console.error('Error in IVR menu:', error);
    response.say('Sorry, we encountered an error. Please try again later.');
    response.redirect('/ivr/welcome');
  }

  res.type('text/xml');
  res.send(response.toString());
});

module.exports = router;