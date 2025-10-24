const express = require('express');
const { authRequired, adminRequired } = require('../middleware/auth');
const { placeOrder, listOrders, adminListOrders, adminUpdateOrder, cancelOrder } = require('../controllers/orderController');

const router = express.Router();

router.use(authRequired);

router.post('/place', placeOrder);
router.get('/', listOrders);
router.patch('/:id/cancel', cancelOrder);

// Admin endpoints
router.get('/admin', adminRequired, adminListOrders);
router.patch('/admin/:id', adminRequired, adminUpdateOrder);

module.exports = router;
