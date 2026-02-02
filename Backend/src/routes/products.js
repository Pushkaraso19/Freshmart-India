const express = require('express');
const multer = require('multer');
const { listProducts, getProduct, createProduct, updateProduct, deleteProduct, searchByImage, adminListProducts, archiveProduct, restoreProduct } = require('../controllers/productController');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
		} else {
			cb(new Error('Only image files are allowed'));
		}
	}
});

router.get('/', listProducts);
router.get('/:id', getProduct);

// Image search endpoint
router.post('/search-by-image', upload.single('image'), searchByImage);

// Admin only routes
router.get('/admin/all', adminRequired, adminListProducts);
router.post('/', adminRequired, createProduct);
router.put('/:id', adminRequired, updateProduct);
router.patch('/:id/archive', adminRequired, archiveProduct);
router.patch('/:id/restore', adminRequired, restoreProduct);
router.delete('/:id', adminRequired, deleteProduct);

module.exports = router;
