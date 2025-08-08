const express = require('express');
const router = express.Router();
const { createBooking, getBookings, getMyBookingsWithUser, getSlotBookings } = require('../controllers/bookingController');
const authentication = require('../middleware/adminAuth');

// Route to get all bookings of the logged-in user
router.get('/', authentication, getBookings);

// New route to create booking with position selection
router.post('/create', authentication, createBooking);

// Route to get all bookings for a specific slot (public - no auth needed)
router.get('/slot/:slotId', getSlotBookings);

// Route to get user bookings with user details
router.get('/id', authentication, getMyBookingsWithUser);

module.exports = router;
