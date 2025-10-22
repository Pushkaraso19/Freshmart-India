const express = require('express');
const { createContact, adminListContacts, adminUpdateContactStatus, adminDeleteContact } = require('../controllers/contactsController');
const { adminRequired } = require('../middleware/auth');

const router = express.Router();

// Public submit
router.post('/', createContact);

// Admin manage
router.get('/admin', adminRequired, adminListContacts);
router.put('/admin/:id', adminRequired, adminUpdateContactStatus);
router.delete('/admin/:id', adminRequired, adminDeleteContact);

module.exports = router;
