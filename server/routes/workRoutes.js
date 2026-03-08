const express = require('express');
const router = express.Router();
const workController = require('../controllers/workController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize(['supervisor']), workController.getAllWorkEntries);
router.post('/', protect, authorize(['supervisor']), workController.createWorkEntry);
router.put('/:id', protect, authorize(['supervisor']), workController.updateWorkEntry);
router.patch('/:id/status', protect, authorize(['supervisor']), workController.updateWorkStatus);

module.exports = router;
