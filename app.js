require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const connectDB = require('./config/db');
const bookingRoutes = require('./routes/booking'); 
const adminRoutes = require('./routes/admin');
const slotRoutes = require('./routes/slot');
const bannerRoutes = require('./routes/banner');
const { startCronJobs } = require('./services/cronJobs');

const app = express();

// Middleware
// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Connect to DB
connectDB();

// Start cron jobs for automatic match status updates
startCronJobs();

// Routes
app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bookings',bookingRoutes );
app.use('/api/admin', adminRoutes);
app.use('/api/admin', slotRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/v1', slotRoutes); 
// app.use('/slots/slottype/:slotType', getSlotsBySlotType);
app.use('/uploads', express.static('uploads'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
