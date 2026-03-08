const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { errorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const labourRoutes = require('./routes/labourRoutes');
const workRoutes = require('./routes/workRoutes');
const historyRoutes = require('./routes/historyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const auditRoutes = require('./routes/auditRoutes');

app.use('/api/labourers', labourRoutes);
app.use('/api/work', workRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/audit', auditRoutes);

app.get('/', (req, res) => {
    res.send('ShramFlow - Labour Work Management API is running...');
});

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
