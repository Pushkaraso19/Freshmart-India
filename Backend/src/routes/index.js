const express = require('express');
const authRoutes = require('./auth');
const productRoutes = require('./products');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const accountRoutes = require('./account');
const contactsRoutes = require('./contacts');
const usersRoutes = require('./users');
const paymentRoutes = require('./payment');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/account', accountRoutes);
router.use('/contacts', contactsRoutes);
router.use('/users', usersRoutes);
router.use('/payment', paymentRoutes);

// Debug route to list available Gemini models (temporary)
router.get('/debug/gemini-models', async (req, res) => {
	try {
		const apiKey = process.env.GOOGLE_AI_API_KEY;
		if (!apiKey) return res.status(400).json({ error: 'GOOGLE_AI_API_KEY missing' });
		const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
		const r = await fetch(url);
		const data = await r.json();
		if (!r.ok) {
			return res.status(r.status).json({ error: data?.error?.message || 'Failed to fetch models', raw: data });
		}
		const simplified = (data?.models || []).map(m => ({
			name: m.name,
			displayName: m.displayName,
			supportedGenerationMethods: m.supportedGenerationMethods,
			inputTokenLimit: m.inputTokenLimit,
			outputTokenLimit: m.outputTokenLimit
		}));
		res.json({ count: simplified.length, models: simplified });
	} catch (err) {
		res.status(500).json({ error: err?.message || 'Failed to list models' });
	}
});

module.exports = router;
