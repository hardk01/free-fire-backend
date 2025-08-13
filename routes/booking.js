const express = require('express');
const router = express.Router();
const { createBooking, getMyBookingsWithUser, getSlotBookings, updateWinnerStats, getWinnersBySlot } = require('../controllers/bookingController');
const authentication = require('../middleware/adminAuth');

// New route to create booking with position selection
router.post('/create', authentication, createBooking);

// Route to get all bookings for a specific slot (public - no auth needed)
router.get('/slot/:slotId', getSlotBookings);

// Route to get user bookings with user details
router.get('/id', authentication, getMyBookingsWithUser);

// Route to update winner statistics
router.put('/winner/:bookingId', authentication, updateWinnerStats);

// Route to get winners by slot
router.get('/winners/:slotId', getWinnersBySlot);

module.exports = router;
