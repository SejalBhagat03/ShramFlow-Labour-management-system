const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/report', protect, authorize(['supervisor', 'admin']), reconciliationController.getReconciliationReport);
router.post('/apply/:id', protect, authorize(['supervisor', 'admin']), reconciliationController.applyReconciliation);

module.exports = router;
