const express = require('express');
const { adminRequired } = require('../middleware/auth');
const { adminListUsers, adminUpdateUser } = require('../controllers/usersController');

const router = express.Router();

router.get('/admin', adminRequired, adminListUsers);
router.put('/admin/:id', adminRequired, adminUpdateUser);

module.exports = router;
