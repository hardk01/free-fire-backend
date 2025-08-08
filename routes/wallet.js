const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authentication = require('../middleware/adminAuth');

// Existing Razorpay routes
router.post('/add-funds', authentication, walletController.addFunds);
router.get('/balance', authentication, walletController.getBalance);
router.post('/verify', authentication, walletController.verify);

// Transaction history
router.get('/transactions', authentication, walletController.getTransactionHistory);

// Direct add funds for TranzUPI
router.post('/direct-add-funds', authentication, walletController.directAddFunds);

// Direct withdraw funds for TranzUPI testing
router.post('/direct-withdraw-funds', authentication, walletController.directWithdrawFunds);

// TranzUPI routes
router.post('/tranzupi/add-money', authentication, walletController.tranzupiAddMoney);
router.post('/tranzupi/withdraw', authentication, walletController.tranzupiWithdraw);
router.post('/tranzupi/callback', walletController.tranzupiCallback);
router.post('/tranzupi/withdrawal-callback', walletController.tranzupiWithdrawalCallback);

// Admin routes for withdrawal management
router.get('/admin/pending-withdrawals', authentication, walletController.getPendingWithdrawals);
router.post('/admin/approve-withdrawal/:transactionId', authentication, walletController.approveWithdrawal);
router.post('/admin/reject-withdrawal/:transactionId', authentication, walletController.rejectWithdrawal);

module.exports = router;
