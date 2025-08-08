const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  slot: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Slot', 
    required: true 
  },
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking', 
    required: false 
  },
  position: {
    type: Number,
    required: true,
    min: 1,
    max: 1000
  },
  playerName: {
    type: String,
    required: true,
    trim: true
  },
  teamName: {
    type: String,
    trim: true
  },
  kills: {
    type: Number,
    default: 0,
    min: 0
  },
  prizeAmount: {
    type: Number,
    required: true,
    min: 0
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  matchDate: {
    type: Date,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
winnerSchema.index({ slot: 1, position: 1 });
winnerSchema.index({ matchDate: -1 });

module.exports = mongoose.model('Winner', winnerSchema);
