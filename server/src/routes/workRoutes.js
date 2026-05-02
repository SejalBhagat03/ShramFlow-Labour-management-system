const express = require('express');
const router = express.Router();
const workController = require('../controllers/workController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize(['supervisor']), workController.getAllWorkEntries);
router.post('/', protect, authorize(['supervisor']), workController.createWorkEntry);
router.post('/bulk', protect, authorize(['supervisor']), workController.bulkCreateWorkEntries);
router.post('/undo', protect, authorize(['supervisor']), workController.undoLastEntry);
router.get('/export-weekly', protect, authorize(['supervisor']), workController.exportWeeklyReport);
router.put('/:id', protect, authorize(['supervisor']), workController.updateWorkEntry);
router.patch('/:id/status', protect, authorize(['supervisor']), workController.updateWorkStatus);
router.post('/smart-split', protect, authorize(['supervisor']), workController.getSmartSplit);
router.delete('/:id', protect, authorize(['supervisor']), workController.deleteWorkEntry);

module.exports = router;
