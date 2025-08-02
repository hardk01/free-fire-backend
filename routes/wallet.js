const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Existing Razorpay routes
router.post('/add-funds', authMiddleware, walletController.addFunds);
router.get('/balance', authMiddleware, walletController.getBalance);
router.post('/verify', authMiddleware, walletController.verify);

// Transaction history
router.get('/transactions', authMiddleware, walletController.getTransactionHistory);

// Direct add funds for TranzUPI
router.post('/direct-add-funds', authMiddleware, walletController.directAddFunds);

// Direct withdraw funds for TranzUPI testing
router.post('/direct-withdraw-funds', authMiddleware, walletController.directWithdrawFunds);

// TranzUPI routes
router.post('/tranzupi/add-money', authMiddleware, walletController.tranzupiAddMoney);
router.post('/tranzupi/withdraw', authMiddleware, walletController.tranzupiWithdraw);
router.post('/tranzupi/callback', walletController.tranzupiCallback);
router.post('/tranzupi/withdrawal-callback', walletController.tranzupiWithdrawalCallback);

// Admin routes for withdrawal management
router.get('/admin/pending-withdrawals', adminAuthMiddleware, walletController.getPendingWithdrawals);
router.post('/admin/approve-withdrawal/:transactionId', adminAuthMiddleware, walletController.approveWithdrawal);
router.post('/admin/reject-withdrawal/:transactionId', adminAuthMiddleware, walletController.rejectWithdrawal);

module.exports = router;
