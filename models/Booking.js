// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  slotType: { type: String, enum: ['solo', 'duo', 'squad', 'clash squad', 'lone wolf', 'survival', 'free matches'], required: true },
  selectedPositions: {
    type: Map,
    of: [String], // Array of positions like ['A', 'B']
    required: true
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
