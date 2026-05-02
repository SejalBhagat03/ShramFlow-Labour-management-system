const express = require('express');
const router = express.Router();
const commandCenterController = require('../controllers/commandCenterController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/', protect, authorize(['supervisor', 'admin']), commandCenterController.getDashboardData);

module.exports = router;
