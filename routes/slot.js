const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
  createSlot, 
  getSlots, 
  deleteSlot, 
  getSlotStats, 
  updateMatchStatus, 
  getMatchesByStatus, 
  autoUpdateMatchStatus,
  createGameType,
  getAllGameTypes,
  deleteGameType,
  updateGameType,
  getSlotsByCategory,
  getSlotsBySlotType,
  createGameMode,
  getAllGameModes,
  deleteGameMode,
  updateGameMode
} = require('../controllers/slotController');
const authentication = require('../middleware/adminAuth');

// Create uploads directory for game type images if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/gametypes');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create uploads directory for game mode images if it doesn't exist
const gameModeUploadsDir = path.join(__dirname, '../uploads/gamemodes');
if (!fs.existsSync(gameModeUploadsDir)) {
  fs.mkdirSync(gameModeUploadsDir, { recursive: true });
}

// Configure multer for game type image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gametype-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for game mode image uploads
const gameModeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, gameModeUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gamemode-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const gameModeUpload = multer({ 
  storage: gameModeStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET /api/admin/slots - Get all slots
router.get('/slots', getSlots);

// GET /api/admin/slots/stats/:slotId - Get slot statistics
router.get('/slots/stats/:slotId', getSlotStats);

// GET /api/admin/slots/status/:status - Get matches by status
router.get('/slots/status/:status', getMatchesByStatus);

// POST /api/admin/slots - Create new slot
router.post('/slots', authentication, createSlot);

// PUT /api/admin/slots/:slotId/status - Update match status
router.put('/slots/:slotId/status', authentication, updateMatchStatus);

// POST /api/admin/slots/auto-update - Auto-update match statuses
router.post('/slots/auto-update', authentication, autoUpdateMatchStatus);

// DELETE /api/admin/slots/:id - Delete a slot
router.delete('/slots/:id', authentication, deleteSlot);

// Game Type Routes
// GET /api/admin/gametypes - Get all game types
router.get('/gametypes', getAllGameTypes);

// POST /api/admin/gametypes - Create new game type
router.post('/gametypes', authentication, (req, res, next) => {
  // Handle the file upload for the image
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        msg: err.message || 'Error uploading file'
      });
    }
    
    // Validate that gameType is provided
    if (!req.body.gameType) {
      return res.status(400).json({
        status: false,
        msg: 'Game type name is required'
      });
    }
    
    // Log the received data for debugging
    console.log('Creating game type with:', {
      gameType: req.body.gameType,
      image: req.file ? req.file.filename : 'No image uploaded'
    });
    
    // Continue to the controller
    next();
  });
}, createGameType);

// DELETE /api/admin/gametypes/:id - Delete a game type
router.delete('/gametypes/:id', authentication, deleteGameType);

// PUT /api/admin/gametypes/:id - Update a game type
router.put('/gametypes/:id', authentication, (req, res, next) => {
  // Handle the file upload for the image
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        msg: err.message || 'Error uploading file'
      });
    }
    
    // Validate that gameType is provided
    if (!req.body.gameType) {
      return res.status(400).json({
        status: false,
        msg: 'Game type name is required'
      });
    }
    
    // Log the received data for debugging
    console.log('Updating game type with ID:', req.params.id, {
      gameType: req.body.gameType,
      image: req.file ? req.file.filename : 'No new image uploaded'
    });
    
    // Continue to the controller
    next();
  });
}, updateGameType);

// GET /api/admin/slots/category/:category - Get slots by game type category
router.get('/slots/category/:category', getSlotsByCategory);

// GET /api/admin/slots/slottype/:slotType - Get slots by specific slotType name
router.post('/slots/slottype/', getSlotsBySlotType);

// Game Mode Routes

// GET /api/admin/gamemodes - Get all game modes
router.get('/gamemodes', getAllGameModes);

// POST /api/admin/gamemodes - Create new game mode
router.post('/gamemodes', authentication, (req, res, next) => {
  // Handle the file upload for the image
  gameModeUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        msg: err.message || 'Error uploading file'
      });
    }
    
    // Validate that gameMode is provided
    if (!req.body.gameMode) {
      return res.status(400).json({
        status: false,
        msg: 'Game mode name is required'
      });
    }
    
    // Log the received data for debugging
    console.log('Creating new game mode:', {
      gameMode: req.body.gameMode,
      image: req.file ? req.file.filename : 'No image uploaded'
    });
    
    // Continue to the controller
    next();
  });
}, createGameMode);

// DELETE /api/admin/gamemodes/:id - Delete a game mode
router.delete('/gamemodes/:id', authentication, deleteGameMode);

// PUT /api/admin/gamemodes/:id - Update a game mode
router.put('/gamemodes/:id', authentication, (req, res, next) => {
  // Handle the file upload for the image
  gameModeUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        msg: err.message || 'Error uploading file'
      });
    }
    
    // Validate that gameMode is provided
    if (!req.body.gameMode) {
      return res.status(400).json({
        status: false,
        msg: 'Game mode name is required'
      });
    }
    
    // Log the received data for debugging
    console.log('Updating game mode with ID:', req.params.id, {
      gameMode: req.body.gameMode,
      image: req.file ? req.file.filename : 'No new image uploaded'
    });
    
    // Continue to the controller
    next();
  });
}, updateGameMode);

module.exports = router;
