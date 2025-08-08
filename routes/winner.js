const express = require('express');
const router = express.Router();
const winnerController = require('../controllers/winnerController');
const authentication = require('../middleware/adminAuth');

// Public routes
router.get('/match/:slotId', winnerController.getMatchWinners);
router.get('/completed-matches', winnerController.getCompletedMatches);

// Admin routes (require authentication)
router.get('/admin/match/:slotId/bookings', authentication, winnerController.getMatchBookings);
router.post('/admin/match/:slotId/winner', authentication, winnerController.addMatchWinner);
router.put('/admin/winner/:winnerId', authentication, winnerController.updateMatchWinner);
router.delete('/admin/winner/:winnerId', authentication, winnerController.deleteMatchWinner);

module.exports = router;
