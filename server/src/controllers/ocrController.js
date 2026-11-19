const ocrService = require('../services/ocrService');

/**
 * Endpoint to scan and parse multipart/form-data image uploads.
 * Leverages Tesseract.js locally first, then applies optional Gemini NLP formatting.
 */
exports.scanImage = async (req, res, next) => {
    try {
        // Enforce valid organization context
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        // Validate that multer has captured the uploaded image
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded. Please upload a valid image.' });
        }

        console.log(`[OcrController] Received file: ${req.file.originalname} (${req.file.size} bytes). Processing...`);

        // Perform OCR and AI parsing
        const result = await ocrService.scanAndParseImage(req.file.buffer, req.orgId);

        // Respond with structured data, raw text, confidence score, and optional warnings
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[OcrController] scanImage Error:', error);
        res.status(500).json({
            error: 'OCR Scanning Failure',
            details: error.message
        });
    }
};

/**
 * Backward-compatible endpoint to parse base64-encoded image strings.
 */
exports.parseDiaryImage = async (req, res, next) => {
    try {
        if (!req.orgId || req.orgId === 'null') {
            return res.status(403).json({ error: 'Invalid organization context' });
        }

        const { imageBase64, mimeType = 'image/jpeg' } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Missing imageBase64 data' });
        }

        // Clean up base64 string if it contains the data URI prefix
        let base64Data = imageBase64;
        if (imageBase64.includes('base64,')) {
            base64Data = imageBase64.split('base64,')[1];
        }

        // Convert the base64 string into a buffer to feed it into the scanAndParseImage engine
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const result = await ocrService.scanAndParseImage(imageBuffer, req.orgId);

        res.json({
            success: true,
            entries: result.entries,
            rawText: result.rawText,
            confidence: result.confidence,
            isAiParsed: result.isAiParsed,
            warning: result.warning,
            message: `Successfully parsed ${result.entries?.length || 0} entries.`
        });
    } catch (error) {
        console.error('[OcrController] parseDiaryImage Error:', error);
        
        let userMessage = 'AI Processing failed';
        if (error.message.includes('leaked')) {
            userMessage = 'API Key Leaked! Please generate a new key at aistudio.google.com and update your .env file.';
        } else if (error.message.includes('quota') || error.message.includes('429')) {
            userMessage = 'API Quota Exceeded. Please try again in a few seconds or check your billing plan.';
        } else if (error.message.includes('API key') || error.message.includes('key not found') || error.message.includes('unregistered callers')) {
            userMessage = 'Invalid or missing API Key. Please add a valid GEMINI_API_KEY to your .env file.';
        } else {
            userMessage = error.message || 'Something went wrong on the server';
        }

        res.status(500).json({
            error: userMessage,
            details: error.message
        });
    }
};
