const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
require('../setupEnv');

function authRequired(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'Missing token' });
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
		next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

async function adminRequired(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'Missing token' });
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		// Verify role from database for extra security
		const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [payload.sub]);
		if (!rows.length || rows[0].role !== 'admin') {
			return res.status(403).json({ error: 'Admin access required' });
		}
		req.user = { id: payload.sub, email: payload.email, name: payload.name, role: rows[0].role };
		next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

module.exports = { authRequired, adminRequired };
