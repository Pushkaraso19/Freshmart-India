const express = require('express');
const authRoutes = require('./auth');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const accountRoutes = require('./account');
const contactsRoutes = require('./contacts');
const usersRoutes = require('./users');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/account', accountRoutes);
router.use('/contacts', contactsRoutes);
router.use('/users', usersRoutes);

module.exports = router;
