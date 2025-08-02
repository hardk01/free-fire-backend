const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// TranzUPI Configuration
const TRANZUPI_CONFIG = {
  base_url: process.env.TRANZUPI_BASE_URL || 'https://api.tranzupi.com/v1',
  api_key: process.env.TRANZUPI_API_KEY,
  merchant_id: process.env.TRANZUPI_MERCHANT_ID,
  secret_key: process.env.TRANZUPI_SECRET_KEY
};

// Helper function to create transaction record
const createTransaction = async (data) => {
  try {
    const transaction = new Transaction({
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      transactionId: data.transactionId,
      status: data.status || 'SUCCESS',
      paymentMethod: data.paymentMethod || 'SYSTEM',
      balanceAfter: data.balanceAfter,
      metadata: data.metadata || {}
    });
    
    await transaction.save();
    return transaction;
  } catch (error) {
    console.error('Error creating transaction record:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

exports.addFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    console.log('Amount received:', amount); // Debug log

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required.' 
      });
    }

    // Minimum amount validation for credits/deposits
    if (parseFloat(amount) < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimum amount for adding funds is ₹10.' 
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise and ensure it's an integer
      currency: "INR",
      receipt: `w_${user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`, // Shorter receipt ID
      notes: {
        userId: user._id.toString()
      }
    };

    console.log('Creating order with options:', options); // Debug log

    const order = await razorpay.orders.create(options);
    console.log('Order created:', order); // Debug log

    res.status(200).json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      id: order.id
    });

  } catch (err) {
    console.error('Add Funds Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create payment order',
      details: err.message 
    });
  }
};

exports.verify = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount
    } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment information'
      });
    }

    // Verify the payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // Update user's wallet
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify order exists and is valid
    try {
      const order = await razorpay.orders.fetch(razorpay_order_id);
      if (order.status !== 'paid') {
        return res.status(400).json({
          success: false,
          error: 'Order is not paid'
        });
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      return res.status(400).json({
        success: false,
        error: 'Invalid order'
      });
    }

    // Add the funds to wallet
    const previousBalance = user.wallet;
    user.wallet += parseFloat(amount);
    await user.save();

    // Create transaction record
    await createTransaction({
      userId: user._id,
      type: 'CREDIT',
      amount: parseFloat(amount),
      description: `Razorpay payment - Order: ${razorpay_order_id}`,
      transactionId: razorpay_payment_id,
      status: 'SUCCESS',
      paymentMethod: 'RAZORPAY',
      balanceAfter: user.wallet,
      metadata: {
        orderId: razorpay_order_id,
        signature: razorpay_signature
      }
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and funds added successfully',
      wallet: user.wallet
    });

  } catch (err) {
    console.error('Verify Payment Error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getBalance = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId).select('wallet');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true,
      wallet: user.wallet 
    });
  } catch (err) {
    console.error('Get Balance Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch wallet balance',
      details: err.message 
    });
  }
};

// Direct Add Funds for TranzUPI (bypasses Razorpay)
exports.directAddFunds = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required.' 
      });
    }

    // Minimum amount validation for credits/deposits
    if (parseFloat(amount) < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimum amount for adding funds is ₹10.' 
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Add the funds directly to wallet
    const previousBalance = user.wallet;
    user.wallet += parseFloat(amount);
    await user.save();

    // Create transaction record
    const transactionId = `DIRECT_ADD_${user._id.toString().slice(-8)}_${Date.now()}`;
    await createTransaction({
      userId: user._id,
      type: 'CREDIT',
      amount: parseFloat(amount),
      description: `TranzUPI Mock Payment - Direct Add`,
      transactionId: transactionId,
      status: 'SUCCESS',
      paymentMethod: 'TRANZUPI',
      balanceAfter: user.wallet,
      metadata: {
        mockPayment: true
      }
    });

    console.log(`Direct add funds: Added ₹${amount} to user ${user.email} wallet`);

    res.status(200).json({
      success: true,
      message: 'Funds added successfully',
      wallet: user.wallet,
      amount_added: parseFloat(amount)
    });

  } catch (err) {
    console.error('Direct Add Funds Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add funds',
      details: err.message 
    });
  }
};

// Direct Withdraw Funds for TranzUPI testing (bypasses actual TranzUPI)
exports.directWithdrawFunds = async (req, res) => {
  try {
    const { amount, upi_id, account_holder_name } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required.' 
      });
    }

    // Minimum withdrawal amount validation
    if (parseFloat(amount) < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimum withdrawal amount is ₹10.' 
      });
    }

    if (!upi_id || !account_holder_name) {
      return res.status(400).json({ 
        success: false,
        error: 'UPI ID and account holder name are required.' 
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Check if user has sufficient balance
    if (user.wallet < parseFloat(amount)) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient wallet balance' 
      });
    }

    // Deduct funds from wallet
    const previousBalance = user.wallet;
    user.wallet -= parseFloat(amount);
    await user.save();

    // Create transaction record
    const transactionId = `DIRECT_WITHDRAW_${user._id.toString().slice(-8)}_${Date.now()}`;
    await createTransaction({
      userId: user._id,
      type: 'DEBIT',
      amount: parseFloat(amount),
      description: `TranzUPI Mock Withdrawal to ${upi_id}`,
      transactionId: transactionId,
      status: 'SUCCESS',
      paymentMethod: 'TRANZUPI',
      balanceAfter: user.wallet,
      metadata: {
        upiId: upi_id,
        beneficiaryName: account_holder_name,
        mockWithdrawal: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal processed successfully',
      new_balance: user.wallet,
      amount_withdrawn: parseFloat(amount),
      beneficiary_upi: upi_id,
      beneficiary_name: account_holder_name
    });

  } catch (err) {
    console.error('Direct Withdraw Funds Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process withdrawal',
      details: err.message 
    });
  }
};

// Get Transaction History
exports.getTransactionHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalTransactions = await Transaction.countDocuments({ userId: req.user.userId });
    const totalPages = Math.ceil(totalTransactions / limit);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (err) {
    console.error('Get Transaction History Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch transaction history',
      details: err.message 
    });
  }
};

// TranzUPI Add Money Function with existing wallet integration
exports.tranzupiAddMoney = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required.' 
      });
    }

    // Minimum amount validation for credits/deposits
    if (parseFloat(amount) < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimum amount for adding funds is ₹10.' 
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Check if TranzUPI is properly configured
    if (!TRANZUPI_CONFIG.api_key || !TRANZUPI_CONFIG.merchant_id || !TRANZUPI_CONFIG.secret_key) {
      return res.status(500).json({
        success: false,
        error: 'TranzUPI configuration incomplete. Please contact administrator.',
        details: 'API keys not properly configured'
      });
    }

    // Generate unique transaction ID
    const transactionId = `ADD_${user._id.toString().slice(-8)}_${Date.now()}`;

    // For testing purposes, create a mock payment URL that will use existing add-funds API
    if (TRANZUPI_CONFIG.base_url.includes('tranzupi.com/api/create-order') || !TRANZUPI_CONFIG.api_key.startsWith('live_')) {
      // Mock payment flow that integrates with existing wallet API
      const mockPaymentUrl = `${process.env.FRONTEND_URL}mock-payment?transaction_id=${transactionId}&amount=${amount}&merchant_id=${TRANZUPI_CONFIG.merchant_id}&user_id=${user._id}`;
      
      return res.json({
        success: true,
        payment_url: mockPaymentUrl,
        transaction_id: transactionId,
        amount: parseFloat(amount),
        mode: 'test'
      });
    }

    // Prepare TranzUPI payment request (for production)
    const paymentData = {
      merchant_id: TRANZUPI_CONFIG.merchant_id,
      amount: parseFloat(amount),
      currency: 'INR',
      transaction_id: transactionId,
      customer_name: user.name,
      customer_email: user.email,
      customer_phone: user.phone,
      description: 'Add money to wallet',
      callback_url: `${process.env.BASE_URL}/api/wallet/tranzupi/callback`,
      success_url: `${process.env.FRONTEND_URL}wallets?status=success`,
      failure_url: `${process.env.FRONTEND_URL}wallets?status=failure`,
      timestamp: Date.now()
    };

    // Generate signature
    const signatureString = `${paymentData.merchant_id}|${paymentData.amount}|${paymentData.currency}|${paymentData.transaction_id}|${paymentData.timestamp}|${TRANZUPI_CONFIG.secret_key}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    paymentData.signature = signature;

    // Create payment request to TranzUPI
    const response = await axios.post(`${TRANZUPI_CONFIG.base_url}`, paymentData, {
      headers: {
        'Authorization': `Bearer ${TRANZUPI_CONFIG.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data.success) {
      res.json({
        success: true,
        payment_url: response.data.payment_url,
        transaction_id: transactionId,
        amount: parseFloat(amount)
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to create payment',
        details: response.data.message
      });
    }

  } catch (err) {
    console.error('TranzUPI Add Money Error:', err);
    
    // Handle network errors specifically
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        success: false,
        error: 'TranzUPI service temporarily unavailable. Please try again later.',
        details: 'Network connectivity issue with TranzUPI API'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to create payment',
      details: err.response?.data?.message || err.message 
    });
  }
};

// TranzUPI Withdrawal Function
exports.tranzupiWithdraw = async (req, res) => {
  try {
    const { amount, upi_id, account_holder_name } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid amount is required.' 
      });
    }

    // Minimum withdrawal amount validation
    if (parseFloat(amount) < 10) {
      return res.status(400).json({ 
        success: false,
        error: 'Minimum withdrawal amount is ₹10.' 
      });
    }

    if (!upi_id || !account_holder_name) {
      return res.status(400).json({ 
        success: false,
        error: 'UPI ID and account holder name are required.' 
      });
    }

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Check if user has sufficient balance
    if (user.wallet < parseFloat(amount)) {
      return res.status(400).json({ 
        success: false,
        error: 'Insufficient wallet balance' 
      });
    }

    // Check if TranzUPI is properly configured
    if (!TRANZUPI_CONFIG.api_key || !TRANZUPI_CONFIG.merchant_id || !TRANZUPI_CONFIG.secret_key) {
      return res.status(500).json({ 
        success: false,
        error: 'TranzUPI configuration incomplete. Please contact administrator.',
        details: 'Missing API credentials in environment variables'
      });
    }

    // Generate unique transaction ID
    const transactionId = `WITHDRAW_${user._id.toString().slice(-8)}_${Date.now()}`;

    // Create a pending withdrawal transaction that requires admin approval
    const withdrawalTransaction = await createTransaction({
      userId: user._id,
      type: 'WITHDRAW',
      amount: parseFloat(amount),
      description: `Withdrawal request to ${upi_id} - Pending admin approval`,
      transactionId: transactionId,
      status: 'PENDING_ADMIN_APPROVAL',
      paymentMethod: 'TRANZUPI',
      balanceAfter: user.wallet, // Balance not changed yet
      metadata: {
        upiId: upi_id,
        beneficiaryName: account_holder_name,
        requiresAdminApproval: true
      }
    });

    // Check if we're in test/development mode (mock withdrawal for admin approval testing)
    if (TRANZUPI_CONFIG.base_url.includes('tranzupi.com/api/create-order') || !TRANZUPI_CONFIG.api_key.startsWith('live_')) {
      return res.json({
        success: true,
        message: 'Withdrawal request submitted successfully. It will be processed after admin approval.',
        transaction_id: transactionId,
        amount: parseFloat(amount),
        status: 'PENDING_ADMIN_APPROVAL',
        requires_approval: true
      });
    }

    // Prepare TranzUPI withdrawal request (for production)
    const withdrawalData = {
      merchant_id: TRANZUPI_CONFIG.merchant_id,
      amount: parseFloat(amount),
      currency: 'INR',
      transaction_id: transactionId,
      beneficiary_name: account_holder_name,
      beneficiary_upi: upi_id,
      customer_name: user.name,
      customer_email: user.email,
      customer_phone: user.phone,
      description: 'Wallet withdrawal',
      callback_url: `${process.env.BASE_URL}/api/wallet/tranzupi/withdrawal-callback`,
      timestamp: Date.now()
    };

    // Generate signature
    const signatureString = `${withdrawalData.merchant_id}|${withdrawalData.amount}|${withdrawalData.currency}|${withdrawalData.transaction_id}|${withdrawalData.timestamp}|${TRANZUPI_CONFIG.secret_key}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    withdrawalData.signature = signature;

    // Create withdrawal request to TranzUPI
    const response = await axios.post(`${TRANZUPI_CONFIG.base_url}/payout/create`, withdrawalData, {
      headers: {
        'Authorization': `Bearer ${TRANZUPI_CONFIG.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.data.success) {
      // Deduct amount from user wallet immediately (pending confirmation)
      user.wallet -= parseFloat(amount);
      await user.save();

      res.json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        transaction_id: transactionId,
        amount: parseFloat(amount),
        remaining_balance: user.wallet,
        status: 'pending'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to create withdrawal',
        details: response.data.message
      });
    }

  } catch (err) {
    console.error('TranzUPI Withdrawal Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process withdrawal',
      details: err.response?.data?.message || err.message 
    });
  }
};

// TranzUPI Payment Callback (for add money)
exports.tranzupiCallback = async (req, res) => {
  try {
    const { transaction_id, status, amount, signature } = req.body;

    // For testing with mock payments
    if (signature === 'mock_signature_for_testing') {
      if (status === 'success') {
        // Extract user ID from transaction ID
        const userIdPart = transaction_id.split('_')[1];
        const user = await User.findOne({ 
          _id: { $regex: new RegExp(userIdPart + '$') }
        });

        if (user) {
          // Use existing add-funds logic instead of direct wallet update
          user.wallet += parseFloat(amount);
          await user.save();
          
          console.log(`TranzUPI Mock: Added ₹${amount} to user ${user.email} wallet via existing API`);
        }
      }
      return res.json({ success: true });
    }

    // Verify signature for production
    const signatureString = `${transaction_id}|${status}|${amount}|${TRANZUPI_CONFIG.secret_key}`;
    const expectedSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid signature' 
      });
    }

    if (status === 'success') {
      // Extract user ID from transaction ID
      const userIdPart = transaction_id.split('_')[1];
      const user = await User.findOne({ 
        _id: { $regex: new RegExp(userIdPart + '$') }
      });

      if (user) {
        // Use existing add-funds logic
        user.wallet += parseFloat(amount);
        await user.save();

        console.log(`TranzUPI: Added ₹${amount} to user ${user.email} wallet`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('TranzUPI Callback Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Callback processing failed' 
    });
  }
};

// Admin Functions for Withdrawal Approval

// Get all pending withdrawal requests (Admin only)
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const pendingWithdrawals = await Transaction.find({
      type: 'WITHDRAW',
      status: 'PENDING_ADMIN_APPROVAL'
    })
    .populate('userId', 'name email phone freeFireUsername')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      withdrawals: pendingWithdrawals
    });

  } catch (err) {
    console.error('Get Pending Withdrawals Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending withdrawals',
      details: err.message
    });
  }
};

// Approve withdrawal request (Admin only)
exports.approveWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const adminId = req.admin._id; // Admin ID from admin auth middleware

    const transaction = await Transaction.findOne({
      transactionId: transactionId,
      type: 'WITHDRAW',
      status: 'PENDING_ADMIN_APPROVAL'
    }).populate('userId');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal request not found or already processed'
      });
    }

    const user = transaction.userId;

    // Check if user has sufficient balance
    if (user.wallet < transaction.amount) {
      return res.status(400).json({
        success: false,
        error: 'User has insufficient balance for this withdrawal'
      });
    }

    // Process the withdrawal
    user.wallet -= transaction.amount;
    await user.save();

    // Update transaction status
    transaction.status = 'ADMIN_APPROVED';
    transaction.adminApproval.approvedBy = adminId;
    transaction.adminApproval.approvedAt = new Date();
    transaction.balanceAfter = user.wallet;
    transaction.description = `Withdrawal approved by admin - ${transaction.metadata.upiId}`;
    await transaction.save();

    // In production, here you would integrate with actual TranzUPI API to process the withdrawal
    // For now, we'll mark it as successful

    res.status(200).json({
      success: true,
      message: 'Withdrawal approved and processed successfully',
      transaction: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        upiId: transaction.metadata.upiId,
        beneficiaryName: transaction.metadata.beneficiaryName,
        userBalance: user.wallet
      }
    });

  } catch (err) {
    console.error('Approve Withdrawal Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to approve withdrawal',
      details: err.message
    });
  }
};

// Reject withdrawal request (Admin only)
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.admin._id; // Admin ID from admin auth middleware

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    const transaction = await Transaction.findOne({
      transactionId: transactionId,
      type: 'WITHDRAW',
      status: 'PENDING_ADMIN_APPROVAL'
    }).populate('userId');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Withdrawal request not found or already processed'
      });
    }

    // Update transaction status
    transaction.status = 'ADMIN_REJECTED';
    transaction.adminApproval.rejectionReason = rejectionReason;
    transaction.adminApproval.rejectedAt = new Date();
    transaction.description = `Withdrawal rejected by admin - Reason: ${rejectionReason}`;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Withdrawal rejected successfully',
      transaction: {
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        rejectionReason: rejectionReason,
        userEmail: transaction.userId.email
      }
    });

  } catch (err) {
    console.error('Reject Withdrawal Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to reject withdrawal',
      details: err.message
    });
  }
};

// TranzUPI Withdrawal Callback
exports.tranzupiWithdrawalCallback = async (req, res) => {
  try {
    const { transaction_id, status, amount, signature } = req.body;

    // Verify signature
    const signatureString = `${transaction_id}|${status}|${amount}|${TRANZUPI_CONFIG.secret_key}`;
    const expectedSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid signature' 
      });
    }

    // Extract user ID from transaction ID
    const userIdPart = transaction_id.split('_')[1];
    const user = await User.findOne({ 
      _id: { $regex: new RegExp(userIdPart + '$') }
    });

    if (user && status === 'failed') {
      // If withdrawal failed, refund the amount
      user.wallet += parseFloat(amount);
      await user.save();
      console.log(`TranzUPI: Refunded ₹${amount} to user ${user.email} wallet due to failed withdrawal`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('TranzUPI Withdrawal Callback Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Withdrawal callback processing failed' 
    });
  }
};


