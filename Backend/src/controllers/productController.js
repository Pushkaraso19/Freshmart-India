const pool = require('../db/pool');

async function listProducts(req, res) {
	const page = parseInt(req.query.page || '1', 10);
	const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
	const offset = (page - 1) * limit;
	try {
		const { rows } = await pool.query(
			`SELECT id,name,description,category,
			        price AS price_cents,
			        image_url,stock,
			        COALESCE(unit, '') as unit,
			        COALESCE(brand, '') as brand,
			        mrp_cents,
			        is_veg,
			        origin
		 FROM products
		 ORDER BY id
		 LIMIT $1 OFFSET $2`,
			[limit, offset]
		);
		const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int as count FROM products');
		res.json({ items: rows, page, limit, total: count });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to load products' });
	}
}

async function getProduct(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
	try {
		const { rows } = await pool.query(
			`SELECT id,name,description,category,
			        price AS price_cents,
			        image_url,stock,
			        COALESCE(unit, '') as unit,
			        COALESCE(brand, '') as brand,
			        mrp_cents,
			        is_veg,
			        origin
		 FROM products WHERE id=$1`,
			[id]
		);
		if (!rows.length) return res.status(404).json({ error: 'Product not found' });
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to load product' });
	}
}

// Admin only: Create product
async function createProduct(req, res) {
	const { name, description, category, image_url, stock, unit, brand, mrp_cents, is_veg, origin } = req.body;
	// Accept price_cents (preferred) or price (alias)
	const incomingPrice = req.body.price_cents ?? req.body.price;
	// Basic validation
	const parsedPriceCents = Number.isFinite(Number(incomingPrice)) ? parseInt(incomingPrice, 10) : NaN;
	const parsedStock = Number.isFinite(Number(stock)) ? parseInt(stock, 10) : NaN;
	if (!name || Number.isNaN(parsedPriceCents) || Number.isNaN(parsedStock)) {
		return res.status(400).json({ error: 'name, price_cents, and stock are required and must be valid numbers' });
	}
	if (parsedPriceCents < 0 || parsedStock < 0) {
		return res.status(400).json({ error: 'price_cents and stock must be non-negative' });
	}
	try {
		const parsedMrp = mrp_cents != null && Number.isFinite(Number(mrp_cents)) ? parseInt(mrp_cents, 10) : null;
		if (parsedMrp != null && parsedMrp < 0) {
			return res.status(400).json({ error: 'mrp_cents must be non-negative' });
		}
		const { rows } = await pool.query(
			`INSERT INTO products(name,description,category,price,image_url,stock,unit,brand,mrp_cents,is_veg,origin)
			 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			 RETURNING id,name,description,category,price as price_cents,image_url,stock,unit,brand,mrp_cents,is_veg,origin`,
			[
				name,
				description || null,
				category || 'General',
				parsedPriceCents,
				image_url || null,
				parsedStock,
				unit || null,
				brand || null,
				parsedMrp,
				is_veg == null ? null : !!is_veg,
				origin || null
			]
		);
		res.status(201).json(rows[0]);
	} catch (err) {
		console.error(err);
		// Surface common constraint violations
		const msg = err && err.message ? err.message : 'Failed to create product';
		res.status(500).json({ error: msg });
	}
}

// Admin only: Update product
async function updateProduct(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
	const { name, description, category, image_url, stock, unit, brand, mrp_cents, is_veg, origin } = req.body;
	const incomingPrice = req.body.price_cents ?? req.body.price;
	try {
		// Check if product exists
		const check = await pool.query('SELECT id FROM products WHERE id=$1', [id]);
		if (!check.rows.length) return res.status(404).json({ error: 'Product not found' });
		
		// Build update query dynamically
		const updates = [];
		const values = [];
		let paramCount = 1;
		
		if (name !== undefined) { updates.push(`name=$${paramCount++}`); values.push(name); }
		if (description !== undefined) { updates.push(`description=$${paramCount++}`); values.push(description); }
		if (category !== undefined) { updates.push(`category=$${paramCount++}`); values.push(category); }
		if (incomingPrice !== undefined) { updates.push(`price=$${paramCount++}`); values.push(parseInt(incomingPrice, 10)); }
		if (image_url !== undefined) { updates.push(`image_url=$${paramCount++}`); values.push(image_url); }
		if (stock !== undefined) { updates.push(`stock=$${paramCount++}`); values.push(parseInt(stock, 10)); }
		if (unit !== undefined) { updates.push(`unit=$${paramCount++}`); values.push(unit); }
		if (brand !== undefined) { updates.push(`brand=$${paramCount++}`); values.push(brand); }
		if (mrp_cents !== undefined) { updates.push(`mrp_cents=$${paramCount++}`); values.push(mrp_cents == null ? null : parseInt(mrp_cents, 10)); }
		if (is_veg !== undefined) { updates.push(`is_veg=$${paramCount++}`); values.push(is_veg == null ? null : !!is_veg); }
		if (origin !== undefined) { updates.push(`origin=$${paramCount++}`); values.push(origin); }
		updates.push(`updated_at=NOW()`);
		
		if (updates.length === 1) return res.status(400).json({ error: 'No fields to update' });
		
		values.push(id);
		const { rows } = await pool.query(
			`UPDATE products SET ${updates.join(', ')} WHERE id=$${paramCount} RETURNING id,name,description,category,price as price_cents,image_url,stock,unit,brand,mrp_cents,is_veg,origin`,
			values
		);
		res.json(rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to update product' });
	}
}

// Admin only: Delete product
async function deleteProduct(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
	try {
		const { rows } = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id', [id]);
		if (!rows.length) return res.status(404).json({ error: 'Product not found' });
		res.json({ message: 'Product deleted successfully', id: rows[0].id });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to delete product' });
	}
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
