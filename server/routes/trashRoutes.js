const express = require('express');
const router = express.Router();
const trashController = require('../controllers/trashController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);
router.use(authorize(['supervisor']));

router.get('/', trashController.getTrashItems);
router.post('/restore/:id', trashController.restoreItem);
router.delete('/:id', trashController.permanentDelete);

module.exports = router;
