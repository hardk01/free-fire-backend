const express = require('express');
const router = express.Router();
const { 
  createSlot, 
  getSlots, 
  deleteSlot, 
  getSlotStats, 
  updateMatchStatus, 
  getMatchesByStatus, 
  autoUpdateMatchStatus 
} = require('../controllers/slotController');
const adminAuth = require('../middleware/adminAuth');

// GET /api/admin/slots - Get all slots
router.get('/slots',  getSlots);

// GET /api/admin/slots/stats/:slotId - Get slot statistics
router.get('/slots/stats/:slotId', getSlotStats);

// GET /api/admin/slots/status/:status - Get matches by status
router.get('/slots/status/:status', getMatchesByStatus);

// POST /api/admin/slots - Create new slot
router.post('/slots', adminAuth, createSlot);

// PUT /api/admin/slots/:slotId/status - Update match status
router.put('/slots/:slotId/status', adminAuth, updateMatchStatus);

// POST /api/admin/slots/auto-update - Auto-update match statuses
router.post('/slots/auto-update', adminAuth, autoUpdateMatchStatus);

// DELETE /api/admin/slots/:id - Delete a slot
router.delete('/slots/:id', adminAuth, deleteSlot);

module.exports = router;
