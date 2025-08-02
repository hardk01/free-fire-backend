// services/cronJobs.js
const cron = require('node-cron');
const Slot = require('../models/Slot');

// Function to update match statuses automatically
const updateMatchStatuses = async () => {
  try {
    const now = new Date();
    
    // Update matches from 'upcoming' to 'live'
    // A match becomes live when the current time is within the match start time window
    const matchesToGoLive = await Slot.find({
      status: 'upcoming',
      matchTime: { $lte: now }
    });

    for (const match of matchesToGoLive) {
      await Slot.findByIdAndUpdate(match._id, { status: 'live' });
      console.log(`Match ${match._id} status updated to 'live' at ${now}`);
    }

    // Update matches from 'live' to 'completed'
    // A match completes after it has been live for a certain duration (e.g., 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const matchesToComplete = await Slot.find({
      status: 'live',
      matchTime: { $lte: thirtyMinutesAgo }
    });

    for (const match of matchesToComplete) {
      await Slot.findByIdAndUpdate(match._id, { status: 'completed' });
      console.log(`Match ${match._id} status updated to 'completed' at ${now}`);
    }

    console.log(`Status update completed at ${now}. Updated ${matchesToGoLive.length} to live, ${matchesToComplete.length} to completed.`);
    
  } catch (error) {
    console.error('Error updating match statuses:', error);
  }
};

// Function to start all cron jobs
const startCronJobs = () => {
  // Run every minute to check for status updates
  cron.schedule('* * * * *', updateMatchStatuses);
  console.log('Cron jobs started - Match status updates will run every minute');
  
  // Optional: Run a more comprehensive check every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Clean up any inconsistent states
      const inconsistentMatches = await Slot.find({
        status: 'upcoming',
        matchTime: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
      });
      
      for (const match of inconsistentMatches) {
        await Slot.findByIdAndUpdate(match._id, { status: 'completed' });
        console.log(`Cleaned up match ${match._id} - moved to completed`);
      }
      
    } catch (error) {
      console.error('Error in cleanup cron job:', error);
    }
  });
  
  console.log('Cleanup cron job started - Will run every 5 minutes');
};

// Function to manually trigger status update
const manualStatusUpdate = async () => {
  console.log('Manual status update triggered');
  await updateMatchStatuses();
};

module.exports = {
  startCronJobs,
  updateMatchStatuses,
  manualStatusUpdate
};
