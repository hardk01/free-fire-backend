// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: String, required: true }, // Additional userId field
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  slotType: { 
    type: String, 
    enum: [
      'Solo', 'Duo', 'Squad', 'Clash Squad', 'Lone Wolf', 'Survival', 'Free Matches',
      'solo', 'duo', 'squad', 'clash squad', 'lone wolf', 'survival', 'free matches',
      'full map', 'Full Map'
    ], 
    required: true 
  },
  selectedPositions: {
    type: Map,
    of: [String], // Array of positions like ['A', 'B']
    required: true
  },
  selectedPlayersPositions: {
    type: [String], // Array to store selected player positions like ['Team 1-A', 'Team 1-B', 'Team 2-C']
    default: []
  },
  playerNames: {
    type: Map,
    of: String, // Key-value pairs like 'Team 1-A': 'PlayerName'
    required: true
  },
  totalAmount: { type: Number, required: true },
  entryFee: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['confirmed', 'cancelled', 'completed'], 
    default: 'confirmed' 
  }
}, { timestamps: true });


module.exports = mongoose.model('Booking', bookingSchema);
