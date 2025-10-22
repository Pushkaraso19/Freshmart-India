const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart } = require('../controllers/cartController');

const router = express.Router();

router.use(authRequired);

router.get('/', getCart);
router.post('/add', addToCart);
router.patch('/item/:itemId', updateCartItem);
router.delete('/item/:itemId', removeCartItem);
router.delete('/clear', clearCart);

module.exports = router;
