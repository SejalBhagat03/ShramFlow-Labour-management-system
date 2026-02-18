const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const labourRoutes = require('./routes/labourRoutes');
const workRoutes = require('./routes/workRoutes');
const historyRoutes = require('./routes/historyRoutes');

app.use('/api/labourers', labourRoutes);
app.use('/api/work', workRoutes);
app.use('/api/history', historyRoutes);

app.get('/', (req, res) => {
    res.send('Labour Work Management API is running...');
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB...'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
