const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Worker } = require('worker_threads');
const path = require('path');
const { performance } = require('perf_hooks');
const supabase = require('../config/supabase');

class OcrService {
    constructor() {
        // Initialize Gemini API client for optional downstream AI parsing
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }

    /**
     * Calculates the Levenshtein edit distance between two strings.
     * Used for fuzzy name matching.
     */
    getLevenshteinDistance(a, b) {
        const matrix = [];
        const cleanA = (a || '').toLowerCase().trim();
        const cleanB = (b || '').toLowerCase().trim();

        if (cleanA.length === 0) return cleanB.length;
        if (cleanB.length === 0) return cleanA.length;

        for (let i = 0; i <= cleanB.length; i++) matrix[i] = [i];
        for (let j = 0; j <= cleanA.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= cleanB.length; i++) {
            for (let j = 1; j <= cleanA.length; j++) {
                if (cleanB.charAt(i - 1) === cleanA.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[cleanB.length][cleanA.length];
    }

    /**
     * Performs regex and dictionary-based line-by-line parsing of raw Tesseract text.
     * Extracts names, mappings, tasks, quantities, payments, and dates locally.
     * 100% free of external API quota or latency constraints!
     */
    parseRawTextLocally(rawText, labourers) {
        if (!rawText || !rawText.trim()) return [];

        const lines = rawText.split('\n');
        const parsedData = [];
        const today = new Date().toISOString().split('T')[0];

        // Dictionary to map multilingual terms to clean database values
        const taskMap = {
            'Digging': ['digging', 'khudai', 'diging', 'digger', 'khud', 'khudaee'],
            'Wiring & Pole Fitting': ['wiring', 'fitting', 'wire', 'pole', 'khamba', 'fiting', 'khambha'],
            'Pipe Laying': ['pipe', 'pipeline', 'piping', 'paip'],
            'Masonry & Concrete': ['concrete', 'masonry', 'plaster', 'brick', 'cement', 'road', 'plastar']
        };

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line.length < 4) continue; // Skip stray characters or blank lines

            // 1. Match labourer names fuzzy-wise using Levenshtein distance
            let matchedLabourer = null;
            let bestNameDistance = Infinity;
            const words = line.split(/[\s\-:,]+/);

            if (labourers && labourers.length > 0) {
                // First pass: Direct substring match
                for (const l of labourers) {
                    if (line.toLowerCase().includes(l.name.toLowerCase())) {
                        matchedLabourer = l;
                        bestNameDistance = 0;
                        break;
                    }
                }

                // Second pass: Fuzzy word match
                if (!matchedLabourer) {
                    for (const l of labourers) {
                        const nameParts = l.name.toLowerCase().split(/\s+/);
                        for (const word of words) {
                            const cleanedWord = word.toLowerCase().replace(/[^a-z]/g, '');
                            if (cleanedWord.length < 3) continue;

                            for (const part of nameParts) {
                                const dist = this.getLevenshteinDistance(cleanedWord, part);
                                if (dist < bestNameDistance && dist <= 2) {
                                    bestNameDistance = dist;
                                    matchedLabourer = l;
                                }
                            }
                        }
                    }
                }
            }

            // Handle unmatched names gracefully so supervisors can still review them
            const labourerName = matchedLabourer ? matchedLabourer.name : (words[0] || 'Unrecognized Name');
            const labourerId = matchedLabourer ? matchedLabourer.id : null;
            const nameConfidence = matchedLabourer ? (bestNameDistance === 0 ? 95 : 80) : 40;

            // 2. Multilingual task keyword matching
            let matchedTask = 'Unspecified Work';
            for (const [taskName, keywords] of Object.entries(taskMap)) {
                if (keywords.some(kw => line.toLowerCase().includes(kw))) {
                    matchedTask = taskName;
                    break;
                }
            }

            // 3. Quantitative metrics extraction (Meters and Rupees)
            const metersMatch = line.match(/(\d+)\s*(m|mtr|meter|metres)/i);
            const paymentMatch = line.match(/(\d+)\s*(rs|rupee|₹|inr)/i);
            
            let meters = metersMatch ? Number(metersMatch[1]) : 0;
            let payment = paymentMatch ? Number(paymentMatch[1]) : 0;

            // Fallback: If meters or payment are still 0, look at other numbers in the line
            const allNumbers = line.match(/\d+/g);
            if (allNumbers && allNumbers.length > 0) {
                const nums = allNumbers.map(Number).filter(n => n > 0);
                if (meters === 0 && payment === 0) {
                    if (nums.length === 1) {
                        // Single number: large number is payment, small is meters
                        if (nums[0] > 100) payment = nums[0];
                        else meters = nums[0];
                    } else {
                        // Multiple numbers: standard order is first is meters, second is payment
                        meters = nums[0];
                        payment = nums[1];
                    }
                } else if (meters === 0) {
                    // Find a number that wasn't used for payment
                    const unused = nums.find(n => n !== payment);
                    if (unused !== undefined) meters = unused;
                } else if (payment === 0) {
                    // Find a number that wasn't used for meters
                    const unused = nums.find(n => n !== meters);
                    if (unused !== undefined) payment = unused;
                }
            }

            // 4. Date extraction
            const dateMatch = line.match(/\d{4}-\d{2}-\d{2}/) || line.match(/\d{2}-\d{2}-\d{4}/);
            let date = today;
            if (dateMatch) {
                date = dateMatch[0];
            }

            parsedData.push({
                labourerName,
                labourer_id: labourerId,
                taskType: matchedTask,
                meters,
                payment,
                date,
                confidence: nameConfidence
            });
        }

        return parsedData;
    }

    /**
     * Spawns an isolated CPU worker thread to execute image enhancement and Tesseract OCR.
     * Prevents blocking Node's main Express thread under high CPU loads.
     */
    runOcrWorker(imageBuffer, langs = 'eng+hin') {
        return new Promise((resolve, reject) => {
            const workerPath = path.join(__dirname, '../workers/ocrWorker.js');
            
            const worker = new Worker(workerPath, {
                workerData: {
                    imageBuffer,
                    langs
                }
            });

            const watchdog = setTimeout(() => {
                worker.terminate();
                reject(new Error('OCR Thread processing timed out (45 seconds limit). Watchdog terminated.'));
            }, 45000);

            worker.on('message', (message) => {
                clearTimeout(watchdog);
                if (message.success) {
                    resolve(message);
                } else {
                    reject(new Error(message.error || 'Worker thread failed execution'));
                }
            });

            worker.on('error', (err) => {
                clearTimeout(watchdog);
                reject(err);
            });

            worker.on('exit', (code) => {
                clearTimeout(watchdog);
                if (code !== 0) {
                    reject(new Error(`OCR Worker stopped unexpectedly with exit code ${code}`));
                }
            });
        });
    }

    /**
     * Coordinates the production-grade OCR pipeline.
     * Uses Tesseract local OCR ➡️ then parses locally (Fuzzy/Regex) or via Gemini (AI).
     */
    async scanAndParseImage(imageBuffer, orgId) {
        let rawText = '';
        let confidence = 0;
        let preprocessingMetadata = {};

        console.log('[OcrService] Initiating multi-threaded OCR scanning pipeline...');
        const serviceStart = performance.now();

        try {
            // Run CPU-heavy preprocessing and Tesseract OCR on isolated worker thread
            const workerResult = await this.runOcrWorker(imageBuffer, 'eng+hin');
            
            rawText = workerResult.text || '';
            confidence = workerResult.confidence || 0;
            preprocessingMetadata = workerResult.metadata || {};

            console.log(`[OcrService] Worker thread completed successfully. Raw length: ${rawText.length} chars.`);
            console.log(`[OcrService] Stats: Preprocessing: ${preprocessingMetadata.preprocessingDuration}ms | Tesseract: ${preprocessingMetadata.ocrDuration}ms | Total Thread: ${preprocessingMetadata.totalWorkerDuration}ms`);
            console.log(`[OcrService] Document dimensions: ${preprocessingMetadata.width}x${preprocessingMetadata.height}px | Resized: ${preprocessingMetadata.hasResized} | Binarized: ${preprocessingMetadata.binarized} | Auto-Rotated: ${preprocessingMetadata.autoRotated}`);

        } catch (ocrError) {
            console.error('[OcrService] OCR Pipeline worker thread execution failed:', ocrError);
            throw new Error(`OCR Pipeline failed: ${ocrError.message}`);
        }

        // If Tesseract extracted no text, return early
        if (!rawText.trim()) {
            const totalServiceDuration = Math.round(performance.now() - serviceStart);
            return {
                rawText: '',
                confidence: 0,
                entries: [],
                isAiParsed: false,
                preprocessingMetadata,
                performance: {
                    totalServiceDuration,
                    preprocessingDuration: preprocessingMetadata.preprocessingDuration || 0,
                    ocrDuration: preprocessingMetadata.ocrDuration || 0,
                    workerDuration: preprocessingMetadata.totalWorkerDuration || 0
                },
                message: 'No characters could be detected in the document.'
            };
        }

        // Fetch labourers for contextual fuzzy mapping (Required by both Local and AI parser)
        let labourers = [];
        try {
            const { data } = await supabase
                .from('labourers')
                .select('id, name')
                .eq('organization_id', orgId)
                .eq('is_deleted', false);
            labourers = data || [];
        } catch (dbError) {
            console.error('[OcrService] Supabase labourer fetch warning:', dbError.message);
        }

        let parsedEntries = [];
        let isAiParsed = false;
        let aiWarning = null;

        // PATH A: Use Local Regex & Levenshtein Fuzzy Matching Parser if Gemini is NOT configured
        if (!process.env.GEMINI_API_KEY) {
            console.log('[OcrService] GEMINI_API_KEY not configured. Running Local Regex & Fuzzy Parser...');
            parsedEntries = this.parseRawTextLocally(rawText, labourers);
            const totalServiceDuration = Math.round(performance.now() - serviceStart);

            return {
                rawText,
                confidence,
                entries: parsedEntries,
                isAiParsed: false,
                preprocessingMetadata,
                warning: 'AI parsing skipped: Using Local Regex & Fuzzy String parser.',
                performance: {
                    totalServiceDuration,
                    preprocessingDuration: preprocessingMetadata.preprocessingDuration || 0,
                    ocrDuration: preprocessingMetadata.ocrDuration || 0,
                    workerDuration: preprocessingMetadata.totalWorkerDuration || 0
                },
                message: `OCR scanning completed. Locally parsed ${parsedEntries.length} entries.`
            };
        }

        // PATH B: Attempt Gemini AI Structuring
        try {
            const labourerNames = labourers.map(l => l.name).join(', ');

            const prompt = `
You are an advanced AI parsing assistant for a labour management system.
Your task is to analyze the raw text extracted from a labour diary page (using OCR) and structure it into a JSON array of work entries.

Raw Extracted Text:
"""
${rawText}
"""

For each distinct labour entry in the text, extract:
- labourerName: The name of the labourer.
- taskType: The type of work done (e.g., digging, pole fitting, wiring). Translate Hindi terms to English (e.g., 'khamba' -> 'pole fitting', 'khudai' -> 'digging').
- meters: The quantity in meters (extract number only). Default to 0 if not found.
- payment: Stated or expected payment for this work. Default to 0 if not found.
- date: The date of the work (YYYY-MM-DD format). If no date is found, use the current date or leave blank.

IMPORTANT INSTRUCTIONS:
1. Return ONLY a valid JSON array of objects. Do NOT include markdown tags like \`\`\`json.
2. The JSON array should contain objects with keys: "labourerName", "taskType", "meters", "payment", "date".
3. Known labourers in this organization: [${labourerNames}]. If a parsed name closely matches one of these, map it to the exact name in this list.
4. If you cannot extract any valid structured entries, return an empty array [].
`;

            const models = ["gemini-2.0-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
            let lastAiError;
            let aiResponseText = '';
            let aiSuccess = false;

            console.log('[OcrService] Invoking Gemini NLP structuring loop...');

            for (const modelName of models) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    aiResponseText = response.text().trim();
                    aiSuccess = true;
                    break;
                } catch (err) {
                    console.warn(`[OcrService] AI model ${modelName} failed:`, err.message);
                    lastAiError = err;
                    if (err.message.includes('API key') || err.message.includes('leaked')) {
                        break;
                    }
                }
            }

            if (!aiSuccess) {
                throw lastAiError || new Error('All AI models failed');
            }

            aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();

            const parsedData = JSON.parse(aiResponseText);

            if (Array.isArray(parsedData)) {
                parsedEntries = parsedData.map(entry => {
                    const matchedLabourer = labourers.find(
                        l => l.name.toLowerCase() === (entry.labourerName || '').toLowerCase()
                    );

                    return {
                        ...entry,
                        labourer_id: matchedLabourer ? matchedLabourer.id : null,
                        confidence: matchedLabourer ? 95 : 60
                    };
                });
                isAiParsed = true;
                console.log(`[OcrService] Successfully structured ${parsedEntries.length} entries via AI.`);
            }
        } catch (aiError) {
            console.warn('[OcrService] Gemini parsing layer failed. Executing Local Rules Parser fallback:', aiError.message);
            
            // Execute Local Regex and Fuzzy Levenshtein Parser as fallback!
            parsedEntries = this.parseRawTextLocally(rawText, labourers);

            if (aiError.message.includes('leaked')) {
                aiWarning = 'API Key Leaked! Please update GEMINI_API_KEY in your .env. Running local rules fallback parser.';
            } else if (aiError.message.includes('quota') || aiError.message.includes('429')) {
                aiWarning = 'API Quota Exceeded. Running local rules fallback parser.';
            } else {
                aiWarning = `AI parsing unavailable (${aiError.message}). Running local rules fallback parser.`;
            }
        }

        const totalServiceDuration = Math.round(performance.now() - serviceStart);
        console.log(`[OcrService] Complete pipeline finished in ${totalServiceDuration}ms.`);

        return {
            rawText,
            confidence,
            entries: parsedEntries,
            isAiParsed,
            preprocessingMetadata,
            warning: aiWarning,
            performance: {
                totalServiceDuration,
                preprocessingDuration: preprocessingMetadata.preprocessingDuration || 0,
                ocrDuration: preprocessingMetadata.ocrDuration || 0,
                workerDuration: preprocessingMetadata.totalWorkerDuration || 0
            },
            message: isAiParsed 
                ? `Successfully extracted text and parsed ${parsedEntries.length} structured entries via AI.` 
                : `Local OCR completed. Locally parsed ${parsedEntries.length} entries via rules engine.`
        };
    }
}

module.exports = new OcrService();
