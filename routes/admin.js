const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const slotController = require('../controllers/slotController');
const adminAuth = require('../middleware/adminAuth');

router.post('/login', adminController.adminLogin);

// Get all users
router.get('/users', adminAuth, adminController.getAllUsers);

// Get all slot bookings
router.get('/slot-bookings', adminAuth, adminController.getAllSlotBookings);

// Clean up orphaned bookings
router.delete('/cleanup-bookings', adminAuth, adminController.cleanupOrphanedBookings);

// Tournament rules management
router.post('/slots/:slotId/tournament-rules', adminAuth, slotController.addTournamentRules);
router.put('/slots/:slotId/tournament-rules', adminAuth, slotController.updateTournamentRules);
router.get('/slots/:slotId/tournament-rules', adminAuth, slotController.getTournamentRules);

module.exports = router;

