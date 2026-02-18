const express = require('express');
const router = express.Router();
const DailyWork = require('../models/DailyWork');
const EditHistory = require('../models/EditHistory');
const Labour = require('../models/Labour');

// Get all daily work entries
router.get('/', async (req, res) => {
    try {
        const workEntries = await DailyWork.find().populate('labourDistribution.labourId');
        res.json(workEntries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new daily work entry
router.post('/', async (req, res) => {
    const dailyWork = new DailyWork({
        date: req.body.date,
        location: req.body.location,
        taskType: req.body.taskType,
        totalArea: req.body.totalArea,
        supervisorId: req.body.supervisorId,
        workGroupId: req.body.workGroupId,
        labourDistribution: req.body.labourDistribution
    });

    try {
        // The Mongoose pre-save hook will handle validation for totalArea
        const newWork = await dailyWork.save();

        // Update each labourer's work history
        for (const dist of req.body.labourDistribution) {
            await Labour.findByIdAndUpdate(dist.labourId, {
                $push: {
                    workHistory: {
                        date: req.body.date,
                        location: req.body.location,
                        task: req.body.taskType,
                        meters: dist.meters,
                        payment: dist.payment
                    }
                }
            });
        }

        res.status(201).json(newWork);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a daily work entry with history tracking
router.put('/:id', async (req, res) => {
    try {
        const oldWork = await DailyWork.findById(req.params.id);
        if (!oldWork) return res.status(404).json({ message: 'Work entry not found' });

        const updatedWork = await DailyWork.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        // Log the change in EditHistory
        const history = new EditHistory({
            entityId: req.params.id,
            entityType: 'DailyWork',
            editedBy: req.body.editedBy,
            previousData: oldWork,
            updatedData: updatedWork,
            reason: req.body.editReason
        });
        await history.save();

        res.json(updatedWork);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
