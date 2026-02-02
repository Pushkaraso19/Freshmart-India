const pool = require('../db/pool');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

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
			        origin,
			        COALESCE(tags, '{}') as tags
		 FROM products
		 WHERE is_active = true
		 ORDER BY id
		 LIMIT $1 OFFSET $2`,
			[limit, offset]
		);
		const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int as count FROM products WHERE is_active = true');
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
			        origin,
			        COALESCE(tags, '{}') as tags
		 FROM products WHERE id=$1 AND is_active = true`,
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
	const { name, description, category, image_url, stock, unit, brand, mrp_cents, is_veg, origin, tags, is_active } = req.body;
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
		// Sanitize tags: expect an array of strings
		const cleanTags = Array.isArray(tags)
			? tags.map(t => String(t).trim()).filter(Boolean)
			: null;
		const activeStatus = is_active == null ? true : !!is_active;

		const { rows } = await pool.query(
			`INSERT INTO products(name,description,category,price,image_url,stock,unit,brand,mrp_cents,is_veg,origin,tags,is_active)
			 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
			 RETURNING id,name,description,category,price as price_cents,image_url,stock,unit,brand,mrp_cents,is_veg,origin,COALESCE(tags,'{}') as tags,is_active`,
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
				origin || null,
				cleanTags,
				activeStatus
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
	const { name, description, category, image_url, stock, unit, brand, mrp_cents, is_veg, origin, is_active } = req.body;
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
		if (is_active !== undefined) { updates.push(`is_active=$${paramCount++}`); values.push(!!is_active); }
		if (req.body.tags !== undefined) {
			const cleanTags = Array.isArray(req.body.tags)
				? req.body.tags.map(t => String(t).trim()).filter(Boolean)
				: null;
			updates.push(`tags=$${paramCount++}`);
			values.push(cleanTags);
		}
		updates.push(`updated_at=NOW()`);
		
		if (updates.length === 1) return res.status(400).json({ error: 'No fields to update' });
		
		values.push(id);
		const { rows } = await pool.query(
			`UPDATE products SET ${updates.join(', ')} WHERE id=$${paramCount} RETURNING id,name,description,category,price as price_cents,image_url,stock,unit,brand,mrp_cents,is_veg,origin,COALESCE(tags,'{}') as tags,is_active`,
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
		// Handle foreign key constraint violation
		if (err.code === '23503') {
			return res.status(409).json({ error: 'Cannot delete product that has been ordered. Consider marking it as inactive instead.' });
		}
		res.status(500).json({ error: 'Failed to delete product' });
	}
}

// Image search: Identify products from uploaded image
async function searchByImage(req, res) {
	if (!req.file) {
		return res.status(400).json({ error: 'No image file provided' });
	}

	try {
		// Convert buffer to base64
		const base64Image = req.file.buffer.toString('base64');
		const mimeType = req.file.mimetype;

		// Use Google AI Vision to identify what's in the image
		const prompt = "Identify the food items or grocery products in this image. List only the product names separated by commas. Be specific (e.g., 'red apple', 'chicken breast', 'tomatoes'). If no food/grocery items are visible, respond with 'none'.";

		const imagePart = {
			inlineData: {
				data: base64Image,
				mimeType: mimeType
			}
		};

		// Try models that your key lists as available (see /api/debug/gemini-models)
		const candidateModels = [
			"gemini-2.5-flash",
			"gemini-2.5-pro",
			"gemini-flash-latest",
			"gemini-pro-latest",
			"gemini-2.0-flash",
			"gemini-2.0-flash-001"
		];

		let identifiedItems = '';
		let lastError = null;
		let usedModel = '';
		for (const modelName of candidateModels) {
			try {
				const model = genAI.getGenerativeModel({ model: modelName });
				const result = await model.generateContent([{ text: prompt }, imagePart]);
				const response = await result.response;
				identifiedItems = response.text().trim();
				usedModel = modelName;
				break;
			} catch (e) {
				lastError = e;
				// If model not found (404), try next candidate; otherwise rethrow
				if (!(e && (e.status === 404 || e.statusCode === 404))) {
					throw e;
				}
			}
		}

		if (!identifiedItems) {
			const baseMsg = 'No compatible Gemini model responded for image understanding.';
			const attempted = `Attempted models: ${candidateModels.join(', ')}`;
			const detail = lastError && lastError.message ? ` Last error: ${lastError.message}` : '';
			return res.status(502).json({ error: `${baseMsg} ${attempted}.${detail}` });
		}

		// Normalize and expand keywords for better matching
		const normalized = identifiedItems
			.replace(/[\r\n]+/g, ',')
			.replace(/[\[\]"'`*()]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.toLowerCase();


		const phraseParts = normalized.split(',').map(s => s.trim()).filter(Boolean);
		const tokenParts = normalized.split(/[ ,\/\\-]+/).map(s => s.trim()).filter(Boolean);

		// Domain stopwords and generic adjectives we don't want to match alone
		const STOPWORDS = new Set([
			'red','green','yellow','fresh','freshly','ripe','organic','on','table','plate','bowl','food','grocery','produce',
			'fruit','fruits','vegetable','vegetables','kg','g','gram','grams','ml','ltr','liter','litre','pack','packet','pouch',
			'piece','pieces','pc','pcs','and','with','the','a','an','whole','raw','cut','sliced'
		]);

		// Build a combined keyword list with phrases first, then specific tokens (non-stopwords)
		const phraseCandidates = phraseParts
			.map(p => p.replace(/\s+/g, ' ').trim())
			.filter(p => p.length >= 2);

		const tokenCandidates = tokenParts
			.filter(t => t.length >= 3 && !STOPWORDS.has(t));

		const seen = new Set();
		const keywords = [];
		for (const p of phraseCandidates) {
			if (!seen.has(p)) { keywords.push(p); seen.add(p); }
		}
		for (const t of tokenCandidates) {
			if (!seen.has(t)) { keywords.push(t); seen.add(t); }
		}
		// Expand simple singular forms (tomatoes->tomato, apples->apple)
		const singular = (w) => {
			if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
			if (w.endsWith('oes')) return w.slice(0, -2); // tomatoes->tomato
			if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
			if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
			return w;
		};
		const addWithSingular = (w) => {
			if (!seen.has(w)) { keywords.push(w); seen.add(w); }
			const s = singular(w);
			if (s !== w && !seen.has(s)) { keywords.push(s); seen.add(s); }
		};
		// Rebuild keywords using addWithSingular
		keywords.length = 0;
		seen.clear();
		for (const p of phraseCandidates) addWithSingular(p);
		for (const t of tokenCandidates) addWithSingular(t);

		// Fallback: if removing stopwords made it empty, use tokens anyway
		if (!keywords.length) {
			for (const t of tokenParts) {
				if (t.length >= 3) addWithSingular(t);
			}
		}
		// Cap total keywords
		if (keywords.length > 12) keywords.length = 12;

		if (!keywords.length || normalized === 'none') {
			return res.json({ items: [], identified: 'No products identified', total: 0, debug: { usedModel, raw: identifiedItems, keywords } });
		}


		// Heuristic category hinting
		const meatHints = new Set(['chicken','mutton','meat','poultry','beef','lamb','egg','eggs']);
		const fishHints = new Set(['fish','prawn','shrimp','seafood','salmon','tuna']);
		let categoryHints = [];
		if (keywords.some(k => meatHints.has(k))) categoryHints.push('Meat & Poultry');
		if (keywords.some(k => fishHints.has(k))) categoryHints.push('Fish & Seafood');

		// Build weighted relevance score
		const likeParams = keywords.map(k => `%${k}%`);
		const weightClauses = keywords.map((_, i) => `
			(CASE WHEN name ILIKE $${i+1} THEN 8 ELSE 0 END)
			+ (CASE WHEN brand ILIKE $${i+1} THEN 5 ELSE 0 END)
			+ (CASE WHEN category ILIKE $${i+1} THEN 3 ELSE 0 END)
			+ (CASE WHEN description ILIKE $${i+1} THEN 2 ELSE 0 END)
			+ (CASE WHEN EXISTS (SELECT 1 FROM unnest(COALESCE(tags,'{}')) t WHERE t ILIKE $${i+1}) THEN 6 ELSE 0 END)
		`).join(' + ');

		let whereParts = [`(${keywords.map((_,i)=>`(name ILIKE $${i+1} OR brand ILIKE $${i+1} OR category ILIKE $${i+1} OR description ILIKE $${i+1} OR EXISTS (SELECT 1 FROM unnest(COALESCE(tags,'{}')) t WHERE t ILIKE $${i+1}))`).join(' OR ')})`];
		let params = [...likeParams];
		if (categoryHints.length) {
			whereParts.push(`category = ANY($${params.length + 1})`);
			params.push(categoryHints);
		}

		const sql = `
			SELECT id, name, description, category,
			       price AS price_cents,
			       image_url, stock,
			       COALESCE(unit, '') as unit,
			       COALESCE(brand, '') as brand,
			       mrp_cents, is_veg, origin,
			       COALESCE(tags, '{}') as tags,
			       (${weightClauses}) AS relevance
			FROM products
			WHERE ${whereParts.join(' AND ')} AND is_active = true
			ORDER BY relevance DESC, stock DESC, id
			LIMIT 50`;

		const { rows } = await pool.query(sql, params);

		res.json({ 
			items: rows, 
			identified: identifiedItems,
			total: rows.length,
			debug: { usedModel, keywords, normalized, phraseParts, tokenParts, categoryHints }
		});

	} catch (err) {
		console.error('Image search error:', err);
		const errorMessage = err.message || 'Failed to process image';
		res.status(500).json({ error: errorMessage });
	}
}

// Admin only: List all products (including archived)
async function adminListProducts(req, res) {
	const page = parseInt(req.query.page || '1', 10);
	const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
	const offset = (page - 1) * limit;
	// archived query param meanings:
	// - undefined: show only active
	// - 'only': show only inactive
	// - 'true': show both active and inactive
	const archivedMode = req.query.archived;
	
	try {
		let whereClause = '';
		if (archivedMode === 'only') {
			whereClause = 'WHERE is_active = false';
		} else if (archivedMode === 'true') {
			whereClause = '';
		} else {
			whereClause = 'WHERE is_active = true';
		}
		// Otherwise show both active and archived
		
		const { rows } = await pool.query(
			`SELECT id,name,description,category,
			        price AS price_cents,
			        image_url,stock,
			        COALESCE(unit, '') as unit,
			        COALESCE(brand, '') as brand,
			        mrp_cents,
			        is_veg,
			        origin,
			        COALESCE(tags, '{}') as tags,
			        is_active
		 FROM products
		 ${whereClause}
		 ORDER BY id ASC
		 LIMIT $1 OFFSET $2`,
			[limit, offset]
		);
		
		const countQuery = whereClause 
			? `SELECT COUNT(*)::int as count FROM products ${whereClause}`
			: 'SELECT COUNT(*)::int as count FROM products';
		const { rows: [{ count }] } = await pool.query(countQuery);
		
		res.json({ items: rows, page, limit, total: count });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to load products' });
	}
}

// Admin only: Archive product (soft delete)
async function archiveProduct(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
	try {
		const { rows } = await pool.query(
			'UPDATE products SET is_active = false WHERE id=$1 RETURNING id, name, is_active',
			[id]
		);
		if (!rows.length) return res.status(404).json({ error: 'Product not found' });
		res.json({ message: 'Product archived successfully', product: rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to archive product' });
	}
}

// Admin only: Restore archived product
async function restoreProduct(req, res) {
	const id = parseInt(req.params.id, 10);
	if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
	try {
		const { rows } = await pool.query(
			'UPDATE products SET is_active = true WHERE id=$1 RETURNING id, name, is_active',
			[id]
		);
		if (!rows.length) return res.status(404).json({ error: 'Product not found' });
		res.json({ message: 'Product restored successfully', product: rows[0] });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to restore product' });
	}
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, searchByImage, adminListProducts, archiveProduct, restoreProduct };
