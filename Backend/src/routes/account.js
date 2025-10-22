const express = require('express')
const { authRequired } = require('../middleware/auth')
const { me, listAddresses, addAddress, updateAddress, deleteAddress } = require('../controllers/accountController')

const router = express.Router()

router.use(authRequired)

router.get('/me', me)

router.get('/addresses', listAddresses)
router.post('/addresses', addAddress)
router.patch('/addresses/:id', updateAddress)
router.delete('/addresses/:id', deleteAddress)

module.exports = router
