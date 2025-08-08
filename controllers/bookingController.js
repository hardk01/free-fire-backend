const Booking = require('../models/Booking');
const User = require('../models/User');
const Slot = require('../models/Slot');

// Helper function to normalize slot type to match enum values
const normalizeSlotType = (slotType) => {
  if (!slotType) return 'solo';
  
  const type = slotType.toLowerCase().trim();
  
  // Map various formats to standardized enum values
  const typeMap = {
    'solo': 'solo',
    'duo': 'duo', 
    'squad': 'squad',
    'clash squad': 'clash squad',
    'lone wolf': 'lone wolf',
    'survival': 'survival',
    'free matches': 'free matches',
    // Handle variations that shouldn't be slot types but might appear
    'full map': 'squad', // Default to squad for full map
    'fullmap': 'squad',
    'full-map': 'squad'
  };
  
  return typeMap[type] || type;
};

// Create booking with position selection
exports.createBooking = async (req, res) => {
  try {
    const { 
      slotId, 
      selectedPositions, 
      playerNames, 
      totalAmount, 
      slotType, 
      entryFee,
      userId // New userId field
    } = req.body;

    // Validate required fields
    if (!slotId || !selectedPositions || !playerNames || totalAmount === undefined || totalAmount === null || !userId) {
      return res.status(400).json({ 
        msg: 'Missing required fields: slotId, selectedPositions, playerNames, totalAmount, userId' 
      });
    }

    // Find user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Find slot
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ msg: 'Slot not found' });
    }

    // Validate slot type - normalize both for comparison
    if (normalizeSlotType(slot.slotType) !== normalizeSlotType(slotType)) {
      return res.status(400).json({ msg: 'Slot type mismatch' });
    }

    // Check if slot has available bookings
    if (slot.remainingBookings <= 0) {
      return res.status(400).json({ msg: 'Slot is full' });
    }

    // Validate total amount calculation
    const positionsCount = Object.values(selectedPositions).reduce((total, positions) => total + positions.length, 0);
    
    // For Free Matches, entry fee should be 0
    const isFreeMachatch = slotType.toLowerCase() === 'free matches';
    const expectedAmount = isFreeMachatch ? 0 : (slot.entryFee * positionsCount);
    
    if (Math.abs(totalAmount - expectedAmount) > 0.01) {
      return res.status(400).json({ 
        msg: `Amount mismatch. Expected: ${expectedAmount}, Received: ${totalAmount}` 
      });
    }

    // Check wallet balance (skip for free matches)
    if (!isFreeMachatch && user.wallet < totalAmount) {
      return res.status(400).json({ 
        msg: `Insufficient wallet balance. Required: ${totalAmount}, Available: ${user.wallet}` 
      });
    }

    // Validate that all selected positions have player names
    const missingNames = [];
    Object.entries(selectedPositions).forEach(([team, positions]) => {
      positions.forEach(position => {
        const key = `${team}-${position}`;
        if (!playerNames[key] || playerNames[key].trim() === '') {
          missingNames.push(key);
        }
      });
    });

    if (missingNames.length > 0) {
      return res.status(400).json({ 
        msg: `Missing player names for positions: ${missingNames.join(', ')}` 
      });
    }

    // Deduct amount from wallet (skip for free matches)
    if (!isFreeMachatch && totalAmount > 0) {
      user.wallet -= totalAmount;
      await user.save();
    }

    // Decrease remaining slot count by number of positions booked
    slot.remainingBookings -= 1;
    await slot.save();

    // Create booking
    const booking = new Booking({
      user: user._id,
      userId: userId, // Add the userId field
      slot: slot._id,
      slotType: normalizeSlotType(slot.slotType),
      selectedPositions: new Map(Object.entries(selectedPositions)),
      playerNames: new Map(Object.entries(playerNames)),
      totalAmount,
      entryFee: slot.entryFee,
      status: 'confirmed'
    });

    await booking.save();

    // Populate slot details for response
    await booking.populate('slot', 'slotType matchTime totalWinningPrice streamLink');

    res.status(201).json({ 
      msg: 'Booking created successfully', 
      booking: {
        ...booking.toObject(),
        selectedPositions: Object.fromEntries(booking.selectedPositions),
        playerNames: Object.fromEntries(booking.playerNames)
      },
      remainingBalance: user.wallet
    });

  } catch (err) {
    console.error('Booking creation failed:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get user's bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.userId })
      .populate('slot', 'slotType matchTime totalWinningPrice perKill matchTitle tournamentName mapName specialRules maxPlayers streamLink')
      .sort({ createdAt: -1 });

    // Convert Map objects to regular objects for JSON response
    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      let selectedPositions = {};
      let playerNames = {};
      
      // Handle selectedPositions Map safely
      if (booking.selectedPositions) {
        if (booking.selectedPositions instanceof Map) {
          selectedPositions = Object.fromEntries(booking.selectedPositions);
        } else if (typeof booking.selectedPositions === 'object') {
          selectedPositions = booking.selectedPositions;
        }
      }
      
      // Handle playerNames Map safely
      if (booking.playerNames) {
        if (booking.playerNames instanceof Map) {
          playerNames = Object.fromEntries(booking.playerNames);
        } else if (typeof booking.playerNames === 'object') {
          playerNames = booking.playerNames;
        }
      }
      
      return {
        ...bookingObj,
        selectedPositions,
        playerNames
      };
    });

    res.json({ bookings: formattedBookings });
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get user bookings with user details
exports.getMyBookingsWithUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await Booking.find({ user: userId })
      .populate('slot', 'slotType matchTime totalWinningPrice perKill matchTitle tournamentName mapName specialRules maxPlayers streamLink')
      .sort({ createdAt: -1 });

    const user = await User.findById(userId).select('username email wallet');

    // Convert Map objects to regular objects for JSON response
    const formattedBookings = bookings.map(booking => {
      const bookingObj = booking.toObject();
      
      let selectedPositions = {};
      let playerNames = {};
      
      // Handle selectedPositions Map safely
      if (booking.selectedPositions) {
        if (booking.selectedPositions instanceof Map) {
          selectedPositions = Object.fromEntries(booking.selectedPositions);
        } else if (typeof booking.selectedPositions === 'object') {
          selectedPositions = booking.selectedPositions;
        }
      }
      
      // Handle playerNames Map safely
      if (booking.playerNames) {
        if (booking.playerNames instanceof Map) {
          playerNames = Object.fromEntries(booking.playerNames);
        } else if (typeof booking.playerNames === 'object') {
          playerNames = booking.playerNames;
        }
      }
      
      return {
        ...bookingObj,
        selectedPositions,
        playerNames
      };
    });

    res.status(200).json({
      user,
      bookings: formattedBookings
    });

  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ error: err.message });
  }
};

// Legacy booking function (keeping for backward compatibility)
// exports.bookSlot = async (req, res) => {
//   try {
//     const { slotId, slotType, fullName, playerNames } = req.body;

//     const user = await User.findById(req.user.userId);
//     if (!user) return res.status(404).json({ msg: 'User not found' });

//     const slot = await Slot.findById(slotId);
//     if (!slot) return res.status(404).json({ msg: 'Slot not found' });

//     // Check wallet balance
//     if (user.wallet < slot.entryFee) {
//       return res.status(400).json({ msg: 'Insufficient wallet balance' });
//     }

//     // Deduct wallet
//     user.wallet -= slot.entryFee;
//     await user.save();

//     // Create legacy booking format
//     const selectedPositions = new Map([['Team 1', ['A']]]);
//     const playerNamesMap = new Map([[`Team 1-A`, fullName]]);

//     const booking = new Booking({
//       user: user._id,
//       slot: slot._id,
//       slotType: slot.slotType.toLowerCase(),
//       selectedPositions,
//       playerNames: playerNamesMap,
//       totalAmount: slot.entryFee,
//       entryFee: slot.entryFee
//     });

//     await booking.save();

//     res.status(201).json({ msg: 'Slot booked successfully', booking });

//   } catch (err) {
//     console.error('Legacy booking failed:', err);
//     res.status(500).json({ error: err.message });
//   }
// };

// Get all bookings for a specific slot
exports.getSlotBookings = async (req, res) => {
  try {
    const { slotId } = req.params;
    console.log('Fetching bookings for slot:', slotId);

    // Find all bookings for this slot (using 'slot' field, not 'slotId')
    const bookings = await Booking.find({ slot: slotId })
      .select('selectedPositions playerNames createdAt')
      .lean();

    console.log('Found bookings:', bookings.length);

    // Convert Map objects to regular objects for JSON response
    const formattedBookings = bookings.map(booking => {
      let selectedPositions = {};
      let playerNames = {};
      
      // Handle selectedPositions Map - properly convert to object
      if (booking.selectedPositions) {
        if (booking.selectedPositions instanceof Map) {
          selectedPositions = Object.fromEntries(booking.selectedPositions);
        } else if (typeof booking.selectedPositions === 'object') {
          // MongoDB .lean() returns Map as plain object
          selectedPositions = booking.selectedPositions;
        }
      }
      
      // Handle playerNames Map - properly convert to object
      if (booking.playerNames) {
        if (booking.playerNames instanceof Map) {
          playerNames = Object.fromEntries(booking.playerNames);
        } else if (typeof booking.playerNames === 'object') {
          // MongoDB .lean() returns Map as plain object
          playerNames = booking.playerNames;
        }
      }
      
      return {
        ...booking,
        selectedPositions,
        playerNames
      };
    });

    // console.log('Returning formatted bookings:', JSON.stringify(formattedBookings, null, 2));
    res.json(formattedBookings);
  } catch (err) {
    console.error('Error fetching slot bookings:', err);
    res.status(500).json({ error: err.message });
  }
};
