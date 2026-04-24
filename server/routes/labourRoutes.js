const express = require('express');
const router = express.Router();
const labourController = require('../controllers/labourController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize(['supervisor']), labourController.getAllLabourers);
router.post('/', protect, authorize(['supervisor']), labourController.createLabourer);
router.get('/:id/history', protect, authorize(['supervisor']), labourController.getWorkHistory);
router.get('/:id/ledger', protect, authorize(['supervisor', 'labour']), labourController.getLedger);
router.delete('/:id', protect, authorize(['supervisor']), labourController.deleteLabourer);

module.exports = router;
