const express = require('express');
const router = express.Router();
const multer = require('multer');
const ocrController = require('../controllers/ocrController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Configure multer to store uploaded files in a memory buffer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB limit to prevent excessive memory usage
    }
});

// Route for parsing diary image using standard base64 payloads
router.post('/parse-diary', protect, authorize(['supervisor', 'admin']), ocrController.parseDiaryImage);

// Route for uploading files (multipart/form-data) for local Tesseract OCR + AI parsing
router.post('/scan', protect, authorize(['supervisor', 'admin']), upload.single('image'), ocrController.scanImage);

module.exports = router;
