const pool = require('../db/pool');

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
								'unit', p.unit
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

module.exports = { placeOrder, listOrders };

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
								'unit', p.unit
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
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update order' });
	}
}

module.exports.adminListOrders = adminListOrders;
module.exports.adminUpdateOrder = adminUpdateOrder;
