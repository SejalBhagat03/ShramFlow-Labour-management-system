const express = require('express');
const router = express.Router();
const EditHistory = require('../models/EditHistory');

// Get edit history for a specific entity
router.get('/:entityType/:entityId', async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const history = await EditHistory.find({ entityId, entityType })
            .populate('editedBy', 'email')
            .sort({ timestamp: -1 });
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
