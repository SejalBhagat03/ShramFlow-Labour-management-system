const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/create-order', protect, authorize(['supervisor']), paymentController.createOrder);
router.post('/verify', protect, authorize(['supervisor']), paymentController.verifyPayment);
router.post('/manual', protect, authorize(['supervisor']), paymentController.createManualPayment);
router.post('/auto-settle', protect, authorize(['supervisor']), paymentController.autoSettlePayments);

module.exports = router;
