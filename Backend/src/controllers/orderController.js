const pool = require('../db/pool');
const { emitToAdmins } = require('../realtime');

async function placeOrder(req, res) {
	const { shipping_address_id = null } = req.body || {}
	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		const { rows: cartRows } = await client.query(
			`SELECT c.id FROM carts c WHERE c.user_id=$1 AND c.status='open'`,
			[req.user.id]
		);
		if (!cartRows.length) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Cart is empty' });
		}
		const cartId = cartRows[0].id;

		const { rows: items } = await client.query(
			`SELECT ci.product_id, ci.quantity, p.price, p.stock
			 FROM cart_items ci
			 JOIN products p ON p.id = ci.product_id
			 WHERE ci.cart_id=$1`,
			[cartId]
		);
		if (!items.length) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Cart is empty' });
		}

		// Check stock
		for (const it of items) {
			if (it.quantity > it.stock) {
				await client.query('ROLLBACK');
				return res.status(409).json({ error: `Insufficient stock for product ${it.product_id}` });
			}
		}

		// Optional: verify shipping address belongs to the user when provided
		let shippingAddressId = shipping_address_id
		if (shippingAddressId) {
			const { rows: addr } = await client.query('SELECT id FROM addresses WHERE id=$1 AND user_id=$2', [shippingAddressId, req.user.id])
			if (!addr.length) {
				await client.query('ROLLBACK')
				return res.status(400).json({ error: 'Invalid shipping address' })
			}
		}

			const total = items.reduce((sum, it) => sum + it.quantity * it.price, 0);
			const { rows: orderRows } = await client.query(
				`INSERT INTO orders(user_id, shipping_address_id, total_cents, payment_method, payment_status, status)
				 VALUES($1,$2,$3,'cod','pending','placed')
				 RETURNING id, user_id, shipping_address_id, total_cents, payment_method, payment_status, status, created_at`,
				[req.user.id, shippingAddressId, total]
			);
		const order = orderRows[0];

		for (const it of items) {
			await client.query(
				`INSERT INTO order_items(order_id, product_id, quantity, price)
				 VALUES($1,$2,$3,$4)`,
				[order.id, it.product_id, it.quantity, it.price]
			);
			await client.query(
				`UPDATE products SET stock = stock - $1 WHERE id=$2`,
				[it.quantity, it.product_id]
			);
		}

		// Close cart and clear items
		await client.query(`DELETE FROM cart_items WHERE cart_id=$1`, [cartId]);
		await client.query(`UPDATE carts SET status='ordered' WHERE id=$1`, [cartId]);

		// Record a COD transaction immediately as completed
		await client.query(
			`INSERT INTO transactions(order_id, user_id, amount_cents, type, method, status, reference)
			 VALUES($1,$2,$3,'payment','cod','completed', $4)`,
			[order.id, req.user.id, total, `COD-${order.id}-${Date.now()}`]
		);

		await client.query('COMMIT');

		// Emit realtime event for admins
		try {
			// Enrich with user info for admin views
			const { rows: userRows } = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [req.user.id]);
			emitToAdmins('order:created', { order, user: userRows[0] || { id: req.user.id } });
		} catch (e) {
			console.error('emit order:created failed', e);
		}

		res.status(201).json({ order });
	} catch (err) {
		await client.query('ROLLBACK');
		console.error(err);
		res.status(500).json({ error: 'Failed to place order' });
	} finally {
		client.release();
	}
}

async function listOrders(req, res) {
	try {
		const { rows } = await pool.query(
			`SELECT o.id, o.total_cents, o.status, o.payment_method, o.payment_status, o.created_at,
						json_agg(json_build_object(
							'product_id', oi.product_id, 
							'quantity', oi.quantity, 
							'price', oi.price,
							'name', p.name,
							'image', p.image_url,
							'unit', p.unit,
							'tags', COALESCE(p.tags, '{}')
						)) AS items
			 FROM orders o
			 JOIN order_items oi ON oi.order_id = o.id
			 JOIN products p ON p.id = oi.product_id
			 WHERE o.user_id=$1
			 GROUP BY o.id
			 ORDER BY o.id DESC`,
			[req.user.id]
		);
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to load orders' });
	}
}

// Admin: list all orders with user info and items (paginated)
async function adminListOrders(req, res) {
	const page = parseInt(req.query.page || '1', 10);
	const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
	const offset = (page - 1) * limit;
	try {
		const { rows } = await pool.query(
			`SELECT o.id, o.total_cents, o.status, o.payment_method, o.payment_status, o.created_at,
			        u.id as user_id, u.name as user_name, u.email as user_email,
			        COALESCE(json_agg(json_build_object(
								'product_id', oi.product_id, 
								'quantity', oi.quantity, 
								'price', oi.price,
								'name', p.name,
								'image', p.image_url,
								'unit', p.unit,
								'tags', COALESCE(p.tags, '{}')
							)
			        ) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
			 FROM orders o
			 JOIN users u ON u.id = o.user_id
			 LEFT JOIN order_items oi ON oi.order_id = o.id
			 LEFT JOIN products p ON p.id = oi.product_id
			 GROUP BY o.id, u.id
			 ORDER BY o.id DESC
			 LIMIT $1 OFFSET $2`,
			[limit, offset]
		);
		const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int as count FROM orders');
		res.json({ items: rows, page, limit, total: count });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to load orders' });
	}
}

// Admin: update order status and/or payment_status
async function adminUpdateOrder(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
	const { status, payment_status } = req.body || {};
	const validStatus = ['placed','processing','shipped','delivered','cancelled'];
	const validPayment = ['pending','paid','failed','refunded'];

	if (status !== undefined && !validStatus.includes(status)) {
		return res.status(400).json({ error: 'Invalid status' });
	}
	if (payment_status !== undefined && !validPayment.includes(payment_status)) {
		return res.status(400).json({ error: 'Invalid payment_status' });
	}

	if (status === undefined && payment_status === undefined) {
		return res.status(400).json({ error: 'No fields to update' });
	}

	try {
		const updates = [];
		const values = [];
		let i = 1;
		if (status !== undefined) { updates.push(`status=$${i++}`); values.push(status); }
		if (payment_status !== undefined) { updates.push(`payment_status=$${i++}`); values.push(payment_status); }
		updates.push('updated_at=NOW()');
		values.push(id);

		const { rows } = await pool.query(
			`UPDATE orders SET ${updates.join(', ')} WHERE id=$${i} RETURNING id, user_id, total_cents, status, payment_status, payment_method, created_at`,
			values
		);
		if (!rows.length) return res.status(404).json({ error: 'Order not found' });
		const updated = rows[0];
		// Notify admins
		try {
			emitToAdmins('order:updated', { order: updated });
		} catch (e) {
			console.error('emit order:updated failed', e);
		}
		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update order' });
	}
}

// Customer: cancel own order (only if not shipped/delivered/cancelled)
async function cancelOrder(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		// Load order and ensure ownership
		const { rows: orders } = await client.query(
			`SELECT id, user_id, status, payment_method, payment_status, total_cents
				 FROM orders WHERE id=$1 FOR UPDATE`,
			[id]
		);
		if (!orders.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Order not found' });
		}
		const order = orders[0];
		if (order.user_id !== req.user.id) {
			await client.query('ROLLBACK');
			return res.status(403).json({ error: 'Not allowed to cancel this order' });
		}

		// Validate current status
		if (!['placed', 'processing'].includes(order.status)) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: `Cannot cancel an order in status '${order.status}'` });
		}

		// Restore stock for all items in the order
		const { rows: items } = await client.query(
			`SELECT product_id, quantity FROM order_items WHERE order_id=$1`,
			[id]
		);
		for (const it of items) {
			await client.query(
				`UPDATE products SET stock = stock + $1 WHERE id=$2`,
				[it.quantity, it.product_id]
			);
		}

		// If prepaid and paid, mark payment_status refunded and insert a refund transaction
		let newPaymentStatus = order.payment_status;
		if (order.payment_method !== 'cod' && order.payment_status === 'paid') {
			newPaymentStatus = 'refunded';
			await client.query(
				`INSERT INTO transactions(order_id, user_id, amount_cents, type, method, status, reference)
					 VALUES($1,$2,$3,'refund',$4,'completed',$5)`,
				[order.id, req.user.id, order.total_cents, order.payment_method, `REFUND-${order.id}-${Date.now()}`]
			);
		}

		// Update order to cancelled
		const { rows: updated } = await client.query(
			`UPDATE orders
					SET status='cancelled', payment_status=COALESCE($1, payment_status), updated_at=NOW()
				WHERE id=$2
				RETURNING id, user_id, total_cents, status, payment_status, payment_method, created_at`,
			[newPaymentStatus, id]
		);

		await client.query('COMMIT');
		const ord = updated[0];
		// Notify admins about cancellation
		try {
			emitToAdmins('order:updated', { order: ord });
		} catch (e) {
			console.error('emit order:updated (cancel) failed', e);
		}
		return res.json(ord);
	} catch (err) {
		await client.query('ROLLBACK');
		console.error(err);
		return res.status(500).json({ error: 'Failed to cancel order' });
	} finally {
		client.release();
	}
}

module.exports = { placeOrder, listOrders, adminListOrders, adminUpdateOrder, cancelOrder };