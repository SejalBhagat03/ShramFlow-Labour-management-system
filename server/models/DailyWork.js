const mongoose = require('mongoose');

const DailyWorkSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    location: { type: String, required: true },
    taskType: {
        type: String,
        enum: ['Digging Hole', 'Pole Installation', 'Cable Laying', 'Maintenance', 'Repair Work', 'Custom Task'],
        required: true
    },
    totalArea: { type: Number, required: true }, // in meters
    workGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkGroup' },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    labourDistribution: [{
        labourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Labour', required: true },
        meters: { type: Number, required: true },
        payment: { type: Number, required: true }
    }],
    isLocked: { type: Boolean, default: false } // Prevent editing after a certain period if needed
}, { timestamps: true });

// Validation to ensure sum of individual meters <= total area
DailyWorkSchema.pre('save', function (next) {
    const sumMeters = this.labourDistribution.reduce((sum, item) => sum + item.meters, 0);
    if (sumMeters > this.totalArea) {
        return next(new Error('Sum of individual meters exceeds total work area!'));
    }
    next();
});

module.exports = mongoose.model('DailyWork', DailyWorkSchema);
