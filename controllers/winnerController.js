const Winner = require('../models/Winner');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

// Get all winners for a specific match/slot
exports.getMatchWinners = async (req, res) => {
  try {
    const { slotId } = req.params;

    const winners = await Winner.find({ slot: slotId })
      .populate('slot', 'matchTitle slotType matchTime')
      .populate('booking', 'playerNames')
      .populate('addedBy', 'email')
      .sort({ position: 1 });

    res.status(200).json({
      success: true,
      winners
    });
  } catch (err) {
    console.error('Get Match Winners Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match winners',
      details: err.message
    });
  }
};

// Get all completed matches with winners
exports.getCompletedMatches = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get completed slots (matches with status 'completed' or past match time)
    const completedSlots = await Slot.find({
      $or: [
        { status: 'completed' },
        { matchTime: { $lt: new Date() } }
      ]
    })
    .sort({ matchTime: -1 })
    .skip(skip)
    .limit(limit)
    .populate('gameMode');

    // Get winners for each slot
    const slotsWithWinners = await Promise.all(
      completedSlots.map(async (slot) => {
        const winners = await Winner.find({ slot: slot._id })
          .sort({ position: 1 })
          .limit(3); // Top 3 winners

        return {
          ...slot.toObject(),
          winners
        };
      })
    );

    const totalCompleted = await Slot.countDocuments({
      $or: [
        { status: 'completed' },
        { matchTime: { $lt: new Date() } }
      ]
    });

    res.status(200).json({
      success: true,
      matches: slotsWithWinners,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCompleted / limit),
        totalMatches: totalCompleted,
        hasNext: page < Math.ceil(totalCompleted / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Get Completed Matches Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch completed matches',
      details: err.message
    });
  }
};

// Add winner to a match (Admin only)
exports.addMatchWinner = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { 
      bookingId, 
      position, 
      playerName, 
      teamName, 
      kills, 
      prizeAmount, 
      notes 
    } = req.body;
    const adminId = req.user.userId || req.user.adminId; // Handle both token formats

    // Validate required fields (bookingId is now optional)
    if (!position || !playerName || prizeAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: position, playerName, prizeAmount'
      });
    }

    // Validate that we have an admin ID
    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: 'Admin ID not found in token'
      });
    }

    // Check if slot exists
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({
        success: false,
        error: 'Match/Slot not found'
      });
    }

    // Check if booking exists and belongs to this slot (only if bookingId is provided)
    let booking = null;
    if (bookingId) {
      booking = await Booking.findOne({ 
        _id: bookingId, 
        slot: slotId 
      });
      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found for this match'
        });
      }
    }

    // Check if position already exists for this match
    const existingWinner = await Winner.findOne({ 
      slot: slotId, 
      position: position 
    });
    if (existingWinner) {
      return res.status(400).json({
        success: false,
        error: `Position ${position} already has a winner`
      });
    }

    // Create new winner entry
    const winner = new Winner({
      slot: slotId,
      booking: bookingId || null, // Can be null if no booking selected
      position,
      playerName,
      teamName: teamName || '',
      kills: kills || 0,
      prizeAmount,
      addedBy: adminId,
      matchDate: slot.matchTime,
      notes: notes || ''
    });

    await winner.save();

    // Populate the saved winner for response
    await winner.populate('slot', 'matchTitle slotType matchTime');
    if (winner.booking) {
      await winner.populate('booking', 'playerNames');
    }

    res.status(201).json({
      success: true,
      message: 'Winner added successfully',
      winner
    });
  } catch (err) {
    console.error('Add Match Winner Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to add match winner',
      details: err.message
    });
  }
};

// Update winner information (Admin only)
exports.updateMatchWinner = async (req, res) => {
  try {
    const { winnerId } = req.params;
    const { 
      position, 
      playerName, 
      teamName, 
      kills, 
      prizeAmount, 
      isVerified, 
      notes 
    } = req.body;

    const winner = await Winner.findById(winnerId);
    if (!winner) {
      return res.status(404).json({
        success: false,
        error: 'Winner not found'
      });
    }

    // Update fields if provided
    if (position !== undefined) winner.position = position;
    if (playerName !== undefined) winner.playerName = playerName;
    if (teamName !== undefined) winner.teamName = teamName;
    if (kills !== undefined) winner.kills = kills;
    if (prizeAmount !== undefined) winner.prizeAmount = prizeAmount;
    if (isVerified !== undefined) winner.isVerified = isVerified;
    if (notes !== undefined) winner.notes = notes;

    await winner.save();

    await winner.populate('slot', 'matchTitle slotType matchTime');
    await winner.populate('booking', 'playerNames');

    res.status(200).json({
      success: true,
      message: 'Winner updated successfully',
      winner
    });
  } catch (err) {
    console.error('Update Match Winner Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update winner',
      details: err.message
    });
  }
};

// Delete winner (Admin only)
exports.deleteMatchWinner = async (req, res) => {
  try {
    const { winnerId } = req.params;

    const winner = await Winner.findById(winnerId);
    if (!winner) {
      return res.status(404).json({
        success: false,
        error: 'Winner not found'
      });
    }

    await Winner.findByIdAndDelete(winnerId);

    res.status(200).json({
      success: true,
      message: 'Winner deleted successfully'
    });
  } catch (err) {
    console.error('Delete Match Winner Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete winner',
      details: err.message
    });
  }
};

// Get bookings for a specific match (for admin to select winners from)
exports.getMatchBookings = async (req, res) => {
  try {
    const { slotId } = req.params;

    const bookings = await Booking.find({ 
      slot: slotId,
      status: 'confirmed'
    })
    .populate('user', 'name email')
    .populate('slot', 'matchTitle slotType');

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (err) {
    console.error('Get Match Bookings Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match bookings',
      details: err.message
    });
  }
};
