const express = require('express');
const router = express.Router();
const Labour = require('../models/Labour');

// Get all labourers
router.get('/', async (req, res) => {
    try {
        const labourers = await Labour.find();
        res.json(labourers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new labourer
router.post('/', async (req, res) => {
    const labour = new Labour({
        fullName: req.body.fullName,
        nameInHindi: req.body.nameInHindi,
        phone: req.body.phone,
        dailyRate: req.body.dailyRate,
        location: req.body.location
    });

    try {
        const newLabour = await labour.save();
        res.status(201).json(newLabour);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get work history for a labourer
router.get('/:id/history', async (req, res) => {
    try {
        const labour = await Labour.findById(req.id);
        if (!labour) return res.status(404).json({ message: 'Labour not found' });
        res.json(labour.workHistory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
