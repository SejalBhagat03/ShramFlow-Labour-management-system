const mongoose = require('mongoose');

const LabourSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    nameInHindi: { type: String },
    phone: { type: String, required: true, unique: true },
    role: { type: String, default: 'labour' },
    dailyRate: { type: Number, required: true },
    location: { type: String },
    joinDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    workHistory: [{
        date: Date,
        location: String,
        task: String,
        meters: Number,
        payment: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('Labour', LabourSchema);
