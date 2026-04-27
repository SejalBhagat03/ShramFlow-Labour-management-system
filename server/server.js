const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { errorHandler } = require('./middlewares/errorMiddleware');
const { protect } = require('./middlewares/authMiddleware');

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

const SYSTEM_INSTRUCTIONS = `ShramFlow Assistant. 
Reply in 2 sentences max. Use simple Hindi if user uses Hindi.
Help with: Adding Labour, Work, Payments, Fraud.`;

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
    try {
        const { messages, userRole, language } = req.body;
        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            return res.status(500).json({ error: 'AI key missing. Please add GEMINI_API_KEY to your .env file.' });
        }

        const contents = (messages || [])
            .filter(m => m.id !== 'greeting' && m.role !== 'system')
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

        if (contents.length === 0) {
            return res.json({ message: "How can I help you today?" });
        }

        // Context injection
        if (contents[contents.length - 1].role === 'user') {
            contents[contents.length - 1].parts[0].text += `\n\n(Context: User Role: ${userRole || 'labour'}, Preferred Language: ${language === 'hi' ? 'Hindi' : 'English'})`;
        }

        const dynamicInstructions = `ShramFlow Assistant. 
Reply in 2 sentences max. 
CRITICAL: Reply in ${language === 'hi' ? 'Hindi' : 'English'} ONLY.
Help with: Adding Labour, Work, Payments, Fraud.`;

        // Model discovery & fallback (Optimized for Speed)
        const models = ["gemini-2.0-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
        let lastErr;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName, 
                    systemInstruction: dynamicInstructions,
                    generationConfig: {
                        maxOutputTokens: 250,
                        temperature: 0.7,
                    }
                });
                
                const result = await model.generateContent({ contents });
                const response = await result.response;
                return res.json({ message: response.text() });
            } catch (err) {
                console.warn(`[Chat AI] ${modelName} failed:`, err.message);
                lastErr = err;
                
                // If it's a quota error, don't just fail, try next or break if it's a key issue
                if (err.message.includes('API key') || err.message.includes('leaked')) break;
                
                // If it's 429, we might want to try a different model (sometimes quotas are per model)
            }
        }
        
        // If we reach here, all models failed
        if (lastErr?.message?.includes('quota') || lastErr?.message?.includes('429')) {
            return res.status(200).json({ 
                message: "System is a bit busy right now (Quota Reached). Please try again in a few seconds!",
                isError: true 
            });
        }
        
        throw lastErr;
    } catch (error) {
        console.error('[Chat AI Error]:', error.message);
        
        let userMessage = 'AI Communication Failure';
        if (error.message.includes('leaked')) {
            userMessage = 'API Key Leaked! Please generate a new key at aistudio.google.com and update your .env file.';
        } else if (error.message.includes('API key not found')) {
            userMessage = 'Invalid API Key. Please check your .env file.';
        }

        res.status(500).json({ 
            error: userMessage, 
            details: error.message 
        });
    }
});

app.post('/api/translate', async (req, res) => {
    try {
        const { text, targetLang } = req.body;
        if (!text) return res.json({ translatedText: '' });

        const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash-latest"];
        let translatedText = text;
        let success = false;

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: { maxOutputTokens: 100 } 
                });
                const prompt = `Translate the following text to ${targetLang === 'hi' ? 'Hindi' : 'English'}. Return ONLY the translated raw text. Do NOT include any intro, markdown, quotes, or formatting. Just the translation itself.\n\nText: ${text}`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                translatedText = response.text().trim();
                success = true;
                break;
            } catch (err) {
                console.warn(`[Translation] ${modelName} unavailable:`, err.message.substring(0, 100));
                if (err.message.includes('API key')) break;
            }
        }

        res.json({ translatedText, isFallback: !success });
    } catch (error) {
        console.error('[Translation Route Error]:', error.message);
        res.status(500).json({ error: 'Translation Error' });
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
