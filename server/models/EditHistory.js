const mongoose = require('mongoose');

const EditHistorySchema = new mongoose.Schema({
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true }, // ID of the DailyWork or other entity being edited
    entityType: { type: String, required: true }, // e.g., 'DailyWork'
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    previousData: { type: mongoose.Schema.Types.Mixed },
    updatedData: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String }
});

module.exports = mongoose.model('EditHistory', EditHistorySchema);
