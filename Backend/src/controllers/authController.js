const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { emitToAdmins } = require('../realtime');
require('../setupEnv');

function signToken(user) {
	const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
	return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

async function register(req, res) {
	const { name, email, password, phone } = req.body || {};
	if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
	if (!phone) return res.status(400).json({ error: 'phone number required' });
	try {
		const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
		if (existing.rows.length) return res.status(409).json({ error: 'Email already in use' });
		
		const hash = await bcrypt.hash(password, 10);
		const result = await pool.query(
			'INSERT INTO users(name,email,phone,password_hash,role,is_active) VALUES($1,$2,$3,$4,\'customer\',true) RETURNING id,name,email,phone,role,is_active',
			[name.trim(), email, phone, hash]
		);
		const user = result.rows[0];
		const token = signToken(user);
		// Notify admins about new account creation
		try {
			emitToAdmins('user:created', { user });
		} catch (e) {
			console.error('emit user:created failed', e);
		}
		res.status(201).json({ user, token });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Registration failed' });
	}
}

async function login(req, res) {
	const { email, password } = req.body || {};
	if (!email || !password) return res.status(400).json({ error: 'email and password required' });
	try {
		const { rows } = await pool.query(
			'SELECT id,name,email,phone,password_hash,role,is_active FROM users WHERE email=$1 LIMIT 1',
			[email]
		);
		if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
		const user = rows[0];
		if (user.is_active === false) return res.status(403).json({ error: 'Account disabled' });
		const ok = await bcrypt.compare(password, user.password_hash);
		if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
		const token = signToken(user);
		res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }, token });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Login failed' });
	}
}

module.exports = { register, login };
