const mongoose = require('mongoose');

const WorkGroupSchema = new mongoose.Schema({
    groupName: { type: String, required: true },
    supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    labours: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Labour' }],
    status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('WorkGroup', WorkGroupSchema);
