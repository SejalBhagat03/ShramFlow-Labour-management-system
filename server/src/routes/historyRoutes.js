const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/:entityType/:entityId', historyController.getEditHistory);

module.exports = router;
