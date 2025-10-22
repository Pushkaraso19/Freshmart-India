const express = require('express');
const { listProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', listProducts);
router.get('/:id', getProduct);

// Admin only routes
router.post('/', adminRequired, createProduct);
router.put('/:id', adminRequired, updateProduct);
router.delete('/:id', adminRequired, deleteProduct);

module.exports = router;
