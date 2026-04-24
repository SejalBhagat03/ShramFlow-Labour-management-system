const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
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
const projectRoutes = require('./routes/projectRoutes');
const trashRoutes = require('./routes/trashRoutes');
const commandCenterRoutes = require('./routes/commandCenterRoutes');

// --- GEMINI CONFIG (ULTRA STABLE) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_INSTRUCTIONS = `You are ShramFlow Assistant, a helpful AI for the ShramFlow Labour Management App.
Rules:
- Give very short replies (2-3 sentences max).
- If user writes in Hindi, reply in simple Hindi.
- Help with: Adding Labour, Work Entries, Payments, and Fraud Flags.`;

// Health/Verify Route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        has_gemini_key: !!process.env.GEMINI_API_KEY,
        version: '1.1.0-stable'
    });
});

// Chat AI Route
app.post('/api/chat', async (req, res) => {
    console.log('[Chat AI] Processing request...');
    try {
        const { messages, userRole } = req.body;
        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            return res.status(500).json({ error: 'AI key not configured on server.' });
        }

        const contents = (messages || [])
            .filter(m => m.id !== 'greeting' && m.role !== 'system')
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

        // Context injection
        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
            contents[contents.length - 1].parts[0].text += `\n\n(Context: User Role: ${userRole || 'labour'})`;
        }

        // Model discovery & fallback
        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        let lastErr;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_INSTRUCTIONS });
                const result = await model.generateContent({ contents });
                const response = await result.response;
                return res.json({ message: response.text() });
            } catch (err) {
                console.warn(`[Chat AI] ${modelName} failed:`, err.message);
                lastErr = err;
            }
        }
        throw lastErr;
    } catch (error) {
        console.error('[Chat AI Error]:', error);
        res.status(500).json({ error: 'AI Communication Failure', details: error.message });
    }
});

app.use('/api/labourers', labourRoutes);
app.use('/api/work', workRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/command-center', commandCenterRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`[Server] ShramFlow Backend active on port ${PORT}`);
});
