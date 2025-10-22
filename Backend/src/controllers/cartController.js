const pool = require('../db/pool');

async function getOrCreateCart(userId) {
	const { rows } = await pool.query('SELECT id FROM carts WHERE user_id=$1 AND status=\'open\'', [userId]);
	if (rows.length) return rows[0].id;
	const { rows: created } = await pool.query(
		'INSERT INTO carts(user_id,status) VALUES($1,\'open\') RETURNING id',
		[userId]
	);
	return created[0].id;
}

async function getCart(req, res) {
	try {
		const cartId = await getOrCreateCart(req.user.id);
		const { rows: items } = await pool.query(
			`SELECT ci.id, ci.product_id, p.name, p.image_url, p.price AS price_cents, p.unit, p.category, p.is_veg, ci.quantity,
							(ci.quantity * p.price) AS line_total_cents
			 FROM cart_items ci
			 JOIN products p ON p.id = ci.product_id
			 WHERE ci.cart_id = $1
			 ORDER BY ci.id`,
			[cartId]
		);
		const total = items.reduce((sum, it) => sum + Number(it.line_total_cents), 0);
		res.json({ items, total_cents: total });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to load cart' });
	}
}

async function addToCart(req, res) {
	const { productId, quantity } = req.body || {};
	const qty = parseInt(quantity || '1', 10);
	if (!productId || qty <= 0) return res.status(400).json({ error: 'productId and positive quantity required' });
	try {
		const cartId = await getOrCreateCart(req.user.id);
		// ensure product exists and stock sufficient
		const { rows: prodRows } = await pool.query('SELECT id, stock FROM products WHERE id=$1', [productId]);
		if (!prodRows.length) return res.status(404).json({ error: 'Product not found' });
		// upsert cart item
		await pool.query(
			`INSERT INTO cart_items(cart_id, product_id, quantity)
			 VALUES($1,$2,$3)
			 ON CONFLICT (cart_id, product_id)
			 DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
			[cartId, productId, qty]
		);
		return getCart(req, res);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to add to cart' });
	}
}

async function updateCartItem(req, res) {
	const { itemId } = req.params;
	const { quantity } = req.body || {};
	const qty = parseInt(quantity, 10);
	if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Positive quantity required' });
	try {
		const cartId = await getOrCreateCart(req.user.id);
		const { rowCount } = await pool.query(
			'UPDATE cart_items SET quantity=$1 WHERE id=$2 AND cart_id=$3',
			[qty, itemId, cartId]
		);
		if (!rowCount) return res.status(404).json({ error: 'Cart item not found' });
		return getCart(req, res);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update cart item' });
	}
}

async function removeCartItem(req, res) {
	const { itemId } = req.params;
	try {
		const cartId = await getOrCreateCart(req.user.id);
		const { rowCount } = await pool.query('DELETE FROM cart_items WHERE id=$1 AND cart_id=$2', [itemId, cartId]);
		if (!rowCount) return res.status(404).json({ error: 'Cart item not found' });
		return getCart(req, res);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to remove cart item' });
	}
}

async function clearCart(req, res) {
	try {
		const cartId = await getOrCreateCart(req.user.id);
		await pool.query('DELETE FROM cart_items WHERE cart_id=$1', [cartId]);
		return getCart(req, res);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to clear cart' });
	}
}

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
