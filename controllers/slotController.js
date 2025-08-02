const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

exports.createSlot = async (req, res) => {
  const {
    slotType,
    entryFee,
    matchTime,
    customStartInMinutes = 10,
    perKill,
    totalWinningPrice,
    maxBookings,
    remainingBookings,
    // Enhanced match information
    matchTitle,
    matchDescription = '',
    mapName = 'Bermuda',
    gameMode = 'Classic',
    tournamentName = '#ALPHALIONS',
    maxPlayers,
    registrationDeadline,
    rules = 'Standard Free Fire rules apply',
    prizeDistribution = 'Winner takes all',
    contactInfo = '',
    streamLink = '',
    discordLink = '',
    specialRules = '',
    banList = ''
  } = req.body;

  // Validate slot type - accepts capitalized values as per enum
  const validSlotTypes = ['Solo', 'Duo', 'Squad', 'Clash Squad', 'Lone Wolf', 'Survival', 'Free Matches'];
  if (!validSlotTypes.includes(slotType)) {
    return res.status(400).json({ msg: 'Invalid slot type. Must be Solo, Duo, Squad, Clash Squad, Lone Wolf, Survival, or Free Matches' });
  }

  // Validate numeric values
  if (typeof perKill !== 'number' || perKill < 0) {
    return res.status(400).json({ msg: 'perKill must be a non-negative number' });
  }

  if (typeof totalWinningPrice !== 'number' || totalWinningPrice < 0) {
    return res.status(400).json({ msg: 'totalWinningPrice must be a non-negative number' });
  }

  try {
    const slot = new Slot({
      // Basic slot information
      slotType: slotType,
      entryFee,
      matchTime,
      maxBookings: maxBookings || maxPlayers || 50,
      remainingBookings: remainingBookings || maxPlayers || 50,
      customStartInMinutes,
      perKill,
      totalWinningPrice,
      
      // Enhanced match information (all optional)
      matchTitle: matchTitle ? matchTitle.trim() : '',
      matchDescription,
      mapName,
      gameMode,
      tournamentName,
      maxPlayers: maxPlayers || 0,
      registrationDeadline: registrationDeadline || new Date(),
      rules,
      prizeDistribution,
      contactInfo,
      streamLink,
      discordLink,
      specialRules,
      banList
    });

    await slot.save();
    res.status(201).json({ msg: 'Match created successfully', slot });
  } catch (err) {
    console.error('Match creation failed:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.getSlots = async (req, res) => {
  try {
    const slots = await Slot.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      slots
    });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching slots'
    });
  }
};

exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await Slot.findById(id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        error: 'Slot not found'
      });
    }

    // Delete the slot
    await Slot.findByIdAndDelete(id);

    // Also delete all bookings related to this slot to prevent orphaned records
    await Booking.deleteMany({ slot: id });

    res.status(200).json({
      success: true,
      message: 'Slot and related bookings deleted successfully'
    });

  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting slot'
    });
  }
};

// Add tournament rules to a slot
exports.addTournamentRules = async (req, res) => {
  try {
    const { slotId } = req.params;
    const {
      minimumLevel = 40,
      onlyMobileAllowed = true,
      maxHeadshotRate = 70,
      prohibitedActivities = [
        'Using any type of emulator, hack or third-party application',
        'Inviting unregistered players',
        'Prohibited throwable items: Grenade, smoke, flash freeze, flashbang, etc.',
        'Zone Pack is not allowed',
        'Double Vector gun is not allowed'
      ],
      characterSkill = 'Yes',
      gunAttributes = 'Yes',
      airdropType = 'Yes',
      limitedAmmo = 'Yes',
      roomIdPasswordTime = 15,
      accountNameVerification = true,
      teamRegistrationRules = 'If team members accidentally register in different teams, they will still play together',
      mustRecordGameplay = true,
      screenRecordingRequired = true,
      recordFromJoining = true,
      penaltySystem = {
        violatingRules: 'Penalties',
        noRewards: true,
        permanentBan: false
      }
    } = req.body;

    // Prepare tournament rules data
    const tournamentRulesData = {
      minimumLevel,
      onlyMobileAllowed,
      maxHeadshotRate,
      prohibitedActivities,
      characterSkill,
      gunAttributes,
      airdropType,
      limitedAmmo,
      roomIdPasswordTime,
      accountNameVerification,
      teamRegistrationRules,
      mustRecordGameplay,
      screenRecordingRequired,
      recordFromJoining,
      penaltySystem
    };

    // Use findByIdAndUpdate to avoid full document validation
    const updatedSlot = await Slot.findByIdAndUpdate(
      slotId,
      { $set: { tournamentRules: tournamentRulesData } },
      { 
        new: true, 
        runValidators: false // Skip validation to avoid issues with existing incomplete slots
      }
    );

    if (!updatedSlot) {
      return res.status(404).json({ msg: 'Slot not found' });
    }

    res.json({ msg: 'Tournament rules added successfully', slot: updatedSlot });
  } catch (err) {
    console.error('Error adding tournament rules:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Update tournament rules
exports.updateTournamentRules = async (req, res) => {
  try {
    const { slotId } = req.params;
    const tournamentRulesData = req.body;

    // Get current tournament rules first
    const currentSlot = await Slot.findById(slotId);
    if (!currentSlot) {
      return res.status(404).json({ msg: 'Slot not found' });
    }

    // Merge existing tournament rules with new data
    const updatedTournamentRules = {
      ...currentSlot.tournamentRules?.toObject() || {},
      ...tournamentRulesData
    };

    // Use findByIdAndUpdate to avoid full document validation
    const updatedSlot = await Slot.findByIdAndUpdate(
      slotId,
      { $set: { tournamentRules: updatedTournamentRules } },
      { 
        new: true, 
        runValidators: false // Skip validation to avoid issues with existing incomplete slots
      }
    );

    res.json({ msg: 'Tournament rules updated successfully', slot: updatedSlot });
  } catch (err) {
    console.error('Error updating tournament rules:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get tournament rules
exports.getTournamentRules = async (req, res) => {
  try {
    const { slotId } = req.params;

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ msg: 'Slot not found' });
    }

    res.json({ 
      tournamentRules: slot.tournamentRules || {},
      matchTitle: slot.matchTitle,
      slotType: slot.slotType 
    });
  } catch (err) {
    console.error('Error fetching tournament rules:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get slot statistics including total bookings count
exports.getSlotStats = async (req, res) => {
  try {
    const { slotId } = req.params;
    const Booking = require('../models/Booking');

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ msg: 'Slot not found' });
    }

    // Count total bookings for this slot from all users
    const totalBookings = await Booking.countDocuments({ slot: slotId });
    
    // Count total positions booked
    const bookings = await Booking.find({ slot: slotId }).select('selectedPositions');
    const totalPositionsBooked = bookings.reduce((total, booking) => {
      if (booking.selectedPositions) {
        const positions = booking.selectedPositions instanceof Map 
          ? Array.from(booking.selectedPositions.values()).flat()
          : Object.values(booking.selectedPositions).flat();
        return total + positions.length;
      }
      return total;
    }, 0);

    res.json({
      slot: {
        _id: slot._id,
        slotType: slot.slotType,
        maxBookings: slot.maxBookings,
        remainingBookings: slot.remainingBookings,
        maxPlayers: slot.maxPlayers || slot.maxBookings
      },
      stats: {
        totalBookings,
        totalPositionsBooked,
        availablePositions: (slot.maxPlayers || slot.maxBookings) - totalPositionsBooked
      }
    });
  } catch (err) {
    console.error('Error fetching slot stats:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Update match status manually
exports.updateMatchStatus = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['upcoming', 'live', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        msg: 'Invalid status. Must be one of: upcoming, live, completed, cancelled' 
      });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ msg: 'Slot not found' });
    }

    // Update the status
    slot.status = status;
    await slot.save();

    res.status(200).json({ 
      msg: 'Match status updated successfully', 
      slot: {
        _id: slot._id,
        matchTitle: slot.matchTitle,
        status: slot.status,
        matchTime: slot.matchTime
      }
    });
  } catch (err) {
    console.error('Error updating match status:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Get matches by status
exports.getMatchesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    // Validate status
    const validStatuses = ['upcoming', 'live', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        msg: 'Invalid status. Must be one of: upcoming, live, completed, cancelled' 
      });
    }

    const matches = await Slot.find({ status }).sort({ matchTime: 1 });
    
    res.status(200).json(matches);
  } catch (err) {
    console.error('Error fetching matches by status:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// Auto-update match statuses (can be called manually)
exports.autoUpdateMatchStatus = async (req, res) => {
  try {
    const { manualStatusUpdate } = require('../services/cronJobs');
    await manualStatusUpdate();
    
    res.status(200).json({ 
      msg: 'Match statuses updated successfully' 
    });
  } catch (err) {
    console.error('Error auto-updating match statuses:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
