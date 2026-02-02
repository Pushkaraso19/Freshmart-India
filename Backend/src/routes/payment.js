const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');
const {
	createRazorpayOrder,
	verifyPayment,
	handlePaymentFailure,
	initiateRefund,
	getRefundStatus,
	handleWebhook,
} = require('../controllers/paymentController');

// Create Razorpay order for online payment
router.post('/create-order', authRequired, createRazorpayOrder);

// Verify payment after successful Razorpay checkout
router.post('/verify', authRequired, verifyPayment);

// Handle payment failure
router.post('/failure', authRequired, handlePaymentFailure);

// Initiate refund for an order (admin or order owner)
router.post('/refund/:order_id', authRequired, initiateRefund);

// Get refund status for an order
router.get('/refund/:order_id', authRequired, getRefundStatus);

// Webhook endpoint for Razorpay events (no auth required)
router.post('/webhook', handleWebhook);

module.exports = router;
