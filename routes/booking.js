const express = require('express');
const router = express.Router();
const { createBooking, bookSlot, getBookings, getMyBookingsWithUser, getSlotBookings } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

// Route to get all bookings of the logged-in user
router.get('/', authMiddleware, getBookings);

// New route to create booking with position selection
router.post('/create', authMiddleware, createBooking);

// Route to get all bookings for a specific slot (public - no auth needed)
router.get('/slot/:slotId', getSlotBookings);

// Legacy route to book a slot (keeping for backward compatibility)
// router.post('/book', authMiddleware, bookSlot);

// Route to get user bookings with user details
router.get('/id', authMiddleware, getMyBookingsWithUser);

module.exports = router;
