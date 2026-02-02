const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../db/pool');
const { emitToAdmins } = require('../realtime');

// Initialize Razorpay instance
const razorpay = new Razorpay({
	key_id: process.env.RAZORPAY_KEY_ID,
	key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order for online payment
 * This creates both a Razorpay order and prepares our internal order
 */
async function createRazorpayOrder(req, res) {
	const { shipping_address_id = null } = req.body || {};
	const client = await pool.connect();
	
	try {
		await client.query('BEGIN');

		// Get user's cart
		const { rows: cartRows } = await client.query(
			`SELECT c.id FROM carts c WHERE c.user_id=$1 AND c.status='open'`,
			[req.user.id]
		);
		if (!cartRows.length) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Cart is empty' });
		}
		const cartId = cartRows[0].id;

		// Get cart items with product details
		const { rows: items } = await client.query(
			`SELECT ci.product_id, ci.quantity, p.price, p.stock, p.name, COALESCE(p.tags, '{}') as tags
			 FROM cart_items ci
			 JOIN products p ON p.id = ci.product_id
			 WHERE ci.cart_id=$1`,
			[cartId]
		);
		if (!items.length) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Cart is empty' });
		}

		// Check stock availability
		for (const it of items) {
			if (it.quantity > it.stock) {
				await client.query('ROLLBACK');
				return res.status(409).json({ 
					error: `Insufficient stock for product: ${it.name}. Available: ${it.stock}, Requested: ${it.quantity}` 
				});
			}
		}

		// Verify shipping address if provided
		let shippingAddressId = shipping_address_id;
		if (shippingAddressId) {
			const { rows: addr } = await client.query(
				'SELECT id FROM addresses WHERE id=$1 AND user_id=$2',
				[shippingAddressId, req.user.id]
			);
			if (!addr.length) {
				await client.query('ROLLBACK');
				return res.status(400).json({ error: 'Invalid shipping address' });
			}
		}

		// Calculate total
		const total = items.reduce((sum, it) => sum + it.quantity * it.price, 0);

		// Create internal order with 'pending' payment status
		const { rows: orderRows } = await client.query(
			`INSERT INTO orders(user_id, shipping_address_id, total_cents, payment_method, payment_status, status)
			 VALUES($1, $2, $3, 'online', 'pending', 'placed')
			 RETURNING id, user_id, shipping_address_id, total_cents, payment_method, payment_status, status, created_at`,
			[req.user.id, shippingAddressId, total]
		);
		const order = orderRows[0];

		// Insert order items
		for (const it of items) {
			await client.query(
				`INSERT INTO order_items(order_id, product_id, quantity, price)
				 VALUES($1, $2, $3, $4)`,
				[order.id, it.product_id, it.quantity, it.price]
			);
		}

		// Note: We don't reduce stock yet - that will happen after successful payment verification

		// Create Razorpay order
		const razorpayOrder = await razorpay.orders.create({
			amount: total, // Amount in paise (already in cents/paise from DB)
			currency: 'INR',
			receipt: `order_${order.id}`,
			notes: {
				order_id: order.id,
				user_id: req.user.id,
				user_email: req.user.email || '',
				user_name: req.user.name || '',
			},
		});

		// Store Razorpay order ID in our order record
		await client.query(
			`UPDATE orders SET tracking_number=$1 WHERE id=$2`,
			[razorpayOrder.id, order.id]
		);

		// Create pending transaction
		await client.query(
			`INSERT INTO transactions(order_id, user_id, amount_cents, type, method, status, reference)
			 VALUES($1, $2, $3, 'payment', 'online', 'pending', $4)`,
			[order.id, req.user.id, total, razorpayOrder.id]
		);

		await client.query('COMMIT');

		// Return order details and Razorpay order for frontend
		res.status(201).json({
			order: {
				id: order.id,
				total_cents: order.total_cents,
				razorpay_order_id: razorpayOrder.id,
				razorpay_key_id: process.env.RAZORPAY_KEY_ID,
				amount: razorpayOrder.amount,
				currency: razorpayOrder.currency,
			},
		});
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Create Razorpay order error:', err);
		res.status(500).json({ error: 'Failed to create payment order' });
	} finally {
		client.release();
	}
}

/**
 * Verify Razorpay payment signature and complete the order
 */
async function verifyPayment(req, res) {
	const { 
		razorpay_order_id, 
		razorpay_payment_id, 
		razorpay_signature 
	} = req.body;

	if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
		return res.status(400).json({ error: 'Missing payment verification details' });
	}

	const client = await pool.connect();

	try {
		// Verify signature
		const body = razorpay_order_id + '|' + razorpay_payment_id;
		const expectedSignature = crypto
			.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
			.update(body.toString())
			.digest('hex');

		const isValid = expectedSignature === razorpay_signature;

		if (!isValid) {
			// Invalid signature - mark as failed
			await client.query('BEGIN');
			
			await client.query(
				`UPDATE orders SET payment_status='failed', status='cancelled' 
				 WHERE tracking_number=$1`,
				[razorpay_order_id]
			);

			await client.query(
				`UPDATE transactions SET status='failed' 
				 WHERE reference=$1`,
				[razorpay_order_id]
			);

			await client.query('COMMIT');
			
			return res.status(400).json({ 
				error: 'Payment verification failed',
				success: false 
			});
		}

		// Valid payment - complete the order
		await client.query('BEGIN');

		// Get order details
		const { rows: orderRows } = await client.query(
			`SELECT o.id, o.user_id, o.total_cents, c.id as cart_id
			 FROM orders o
			 JOIN carts c ON c.user_id = o.user_id AND c.status='open'
			 WHERE o.tracking_number=$1`,
			[razorpay_order_id]
		);

		if (!orderRows.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Order not found' });
		}

		const order = orderRows[0];

		// Get order items to reduce stock
		const { rows: items } = await client.query(
			`SELECT oi.product_id, oi.quantity
			 FROM order_items oi
			 WHERE oi.order_id=$1`,
			[order.id]
		);

		// Reduce stock for each item
		for (const item of items) {
			await client.query(
				`UPDATE products SET stock = stock - $1 WHERE id=$2`,
				[item.quantity, item.product_id]
			);
		}

		// Update order status
		await client.query(
			`UPDATE orders SET payment_status='paid', status='processing' 
			 WHERE id=$1`,
			[order.id]
		);

		// Update transaction status and add payment ID
		await client.query(
			`UPDATE transactions 
			 SET status='completed', reference=$1 
			 WHERE order_id=$2 AND type='payment'`,
			[razorpay_payment_id, order.id]
		);

		// Clear cart
		await client.query(`DELETE FROM cart_items WHERE cart_id=$1`, [order.cart_id]);
		await client.query(`UPDATE carts SET status='ordered' WHERE id=$1`, [order.cart_id]);

		await client.query('COMMIT');

		// Emit realtime event for admins
		try {
			const { rows: userRows } = await pool.query(
				'SELECT id, name, email FROM users WHERE id=$1',
				[order.user_id]
			);
			emitToAdmins('order:created', { 
				order: { 
					...order, 
					payment_method: 'online',
					payment_status: 'paid',
					status: 'processing'
				}, 
				user: userRows[0] || { id: order.user_id } 
			});
		} catch (e) {
			console.error('Emit order:created failed', e);
		}

		res.json({
			success: true,
			message: 'Payment verified successfully',
			order_id: order.id,
		});
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Payment verification error:', err);
		res.status(500).json({ error: 'Payment verification failed' });
	} finally {
		client.release();
	}
}

/**
 * Handle payment failure - mark order as failed
 */
async function handlePaymentFailure(req, res) {
	const { razorpay_order_id, error } = req.body;

	if (!razorpay_order_id) {
		return res.status(400).json({ error: 'Missing order ID' });
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Update order status to failed
		await client.query(
			`UPDATE orders SET payment_status='failed', status='cancelled' 
			 WHERE tracking_number=$1`,
			[razorpay_order_id]
		);

		// Update transaction status
		await client.query(
			`UPDATE transactions SET status='failed' 
			 WHERE reference=$1 AND type='payment'`,
			[razorpay_order_id]
		);

		await client.query('COMMIT');

		res.json({
			success: true,
			message: 'Payment failure recorded',
		});
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Handle payment failure error:', err);
		res.status(500).json({ error: 'Failed to update payment status' });
	} finally {
		client.release();
	}
}

/**
 * Initiate a refund for a paid order
 */
async function initiateRefund(req, res) {
	const { order_id } = req.params;
	const { reason, amount_cents } = req.body;

	if (!order_id) {
		return res.status(400).json({ error: 'Order ID is required' });
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Get order and payment details
		const { rows: orderRows } = await client.query(
			`SELECT o.id, o.user_id, o.total_cents, o.payment_status, o.status,
			        t.reference as payment_id, t.amount_cents
			 FROM orders o
			 LEFT JOIN transactions t ON t.order_id = o.id AND t.type='payment' AND t.status='completed'
			 WHERE o.id=$1`,
			[order_id]
		);

		if (!orderRows.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Order not found' });
		}

		const order = orderRows[0];

		// Check if order is eligible for refund
		if (order.payment_status !== 'paid') {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Order is not paid or already refunded' });
		}

		if (!order.payment_id) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Payment ID not found for this order' });
		}

		// Determine refund amount (partial or full)
		const refundAmount = amount_cents || order.amount_cents;
		
		if (refundAmount > order.amount_cents) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Refund amount cannot exceed payment amount' });
		}

		// Check if user has permission (admin or order owner)
		if (req.user.role !== 'admin' && req.user.id !== order.user_id) {
			await client.query('ROLLBACK');
			return res.status(403).json({ error: 'Unauthorized to refund this order' });
		}

		// Create Razorpay refund
		const refund = await razorpay.payments.refund(order.payment_id, {
			amount: refundAmount,
			notes: {
				order_id: order.id,
				reason: reason || 'Customer requested refund',
			},
		});

		// Update order status
		const isFullRefund = refundAmount === order.amount_cents;
		await client.query(
			`UPDATE orders SET payment_status=$1, status=$2 
			 WHERE id=$3`,
			[isFullRefund ? 'refunded' : 'paid', 'cancelled', order.id]
		);

		// Create refund transaction
		await client.query(
			`INSERT INTO transactions(order_id, user_id, amount_cents, type, method, status, reference)
			 VALUES($1, $2, $3, 'refund', 'online', $4, $5)`,
			[order.id, order.user_id, refundAmount, refund.status, refund.id]
		);

		// Restore stock for cancelled order
		const { rows: items } = await client.query(
			`SELECT oi.product_id, oi.quantity
			 FROM order_items oi
			 WHERE oi.order_id=$1`,
			[order.id]
		);

		for (const item of items) {
			await client.query(
				`UPDATE products SET stock = stock + $1 WHERE id=$2`,
				[item.quantity, item.product_id]
			);
		}

		await client.query('COMMIT');

		// Emit realtime event for admins
		try {
			emitToAdmins('order:refunded', { 
				order_id: order.id,
				refund_id: refund.id,
				amount: refundAmount,
				status: refund.status
			});
		} catch (e) {
			console.error('Emit order:refunded failed', e);
		}

		res.json({
			success: true,
			message: 'Refund initiated successfully',
			refund: {
				id: refund.id,
				amount: refundAmount,
				status: refund.status,
				order_id: order.id,
			},
		});
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Refund error:', err);
		
		// Check if it's a Razorpay error
		if (err.error && err.error.description) {
			return res.status(400).json({ error: err.error.description });
		}
		
		res.status(500).json({ error: 'Failed to process refund' });
	} finally {
		client.release();
	}
}

/**
 * Get refund status for an order
 */
async function getRefundStatus(req, res) {
	const { order_id } = req.params;

	try {
		const { rows } = await pool.query(
			`SELECT t.id, t.amount_cents, t.status, t.reference, t.created_at
			 FROM transactions t
			 WHERE t.order_id=$1 AND t.type='refund'
			 ORDER BY t.created_at DESC`,
			[order_id]
		);

		res.json({ refunds: rows });
	} catch (err) {
		console.error('Get refund status error:', err);
		res.status(500).json({ error: 'Failed to fetch refund status' });
	}
}

/**
 * Webhook handler for Razorpay events (optional but recommended)
 */
async function handleWebhook(req, res) {
	const webhookSignature = req.headers['x-razorpay-signature'];
	const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.warn('Razorpay webhook secret not configured');
		return res.status(200).send('OK');
	}

	try {
		// Verify webhook signature
		const body = JSON.stringify(req.body);
		const expectedSignature = crypto
			.createHmac('sha256', webhookSecret)
			.update(body)
			.digest('hex');

		if (webhookSignature !== expectedSignature) {
			return res.status(400).json({ error: 'Invalid webhook signature' });
		}

		const event = req.body.event;
		const payload = req.body.payload;

		console.log('Razorpay webhook event:', event);

		// Handle different webhook events
		switch (event) {
			case 'payment.captured':
				// Payment was successfully captured
				console.log('Payment captured:', payload.payment.entity.id);
				break;

			case 'payment.failed':
				// Payment failed
				console.log('Payment failed:', payload.payment.entity.id);
				break;

			case 'refund.processed':
				// Refund was processed
				const refundEntity = payload.refund.entity;
				await pool.query(
					`UPDATE transactions 
					 SET status='completed' 
					 WHERE reference=$1 AND type='refund'`,
					[refundEntity.id]
				);
				console.log('Refund processed:', refundEntity.id);
				break;

			case 'refund.failed':
				// Refund failed
				const failedRefund = payload.refund.entity;
				await pool.query(
					`UPDATE transactions 
					 SET status='failed' 
					 WHERE reference=$1 AND type='refund'`,
					[failedRefund.id]
				);
				console.log('Refund failed:', failedRefund.id);
				break;

			default:
				console.log('Unhandled webhook event:', event);
		}

		res.status(200).send('OK');
	} catch (err) {
		console.error('Webhook error:', err);
		res.status(500).json({ error: 'Webhook processing failed' });
	}
}

module.exports = {
	createRazorpayOrder,
	verifyPayment,
	handlePaymentFailure,
	initiateRefund,
	getRefundStatus,
	handleWebhook,
};
