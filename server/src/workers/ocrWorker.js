const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { performance } = require('perf_hooks');

/**
 * Advanced worker thread executing image enhancements and Tesseract OCR.
 * Features auto-rotation, adaptive scaling, sharpening, and pure binarization.
 */
async function processWorkerOcr() {
    try {
        const { imageBuffer, langs = 'eng+hin' } = workerData;
        
        if (!imageBuffer) {
            throw new Error('Worker was triggered without an imageBuffer');
        }

        const buffer = Buffer.from(imageBuffer);

        console.log('[ocrWorker] Starting advanced image preprocessing with Sharp...');
        const preprocessingStart = performance.now();

        // 1. Initialize Sharp on the buffer
        const sharpInstance = sharp(buffer);
        
        // 2. Auto-align document horizontally based on EXIF camera orientation tags
        sharpInstance.rotate();

        // Retrieve dimensions
        const originalMetadata = await sharpInstance.metadata();
        let width = originalMetadata.width || 0;
        let height = originalMetadata.height || 0;
        let hasResized = false;

        // 3. Adaptive Scaling: If image width is below 1600px, upscale to 2000px
        // Optimizes character pixel density for handwriting pattern matching
        if (width > 0 && width < 1600) {
            console.log(`[ocrWorker] Rescaling low-resolution document from ${width}px to 2000px width...`);
            sharpInstance.resize({ width: 2000, withoutEnlargement: false });
            hasResized = true;
            
            // Recalculate dimensions for reporting
            const scaleFactor = 2000 / width;
            width = 2000;
            height = Math.round(height * scaleFactor);
        }

        // 4. Run Preprocessing & Binarization (Pure Black on White Background)
        const processedBuffer = await sharpInstance
            .greyscale()                  // Convert color channels into luminance channel
            .normalise()                  // Scale dynamic brightness range to full contrast
            .sharpen({                    // Sharpen handwritten character outlines
                sigma: 1.5,
                m1: 1.0,
                m2: 2.0
            })
            .median(1)                    // Apply 1px median filter to remove visual specks & dust
            .threshold(132)               // Binarize: Any pixel grey value <132 becomes solid black, else white.
            .toBuffer();                  // Saves processed buffer completely in memory

        const preprocessingDuration = Math.round(performance.now() - preprocessingStart);
        console.log(`[ocrWorker] Advanced preprocessing complete in ${preprocessingDuration}ms.`);
        console.log(`[ocrWorker] Enhanced output: ${width}x${height}px | Resized: ${hasResized} | Binarized: true | Auto-Rotated: true`);

        // 5. Run local OCR on the binarized buffer
        console.log('[ocrWorker] Spawning Tesseract character recognition engine...');
        const ocrStart = performance.now();

        const { data } = await Tesseract.recognize(
            processedBuffer,
            langs,
            {
                logger: m => console.log(`[ocrWorker Tesseract] ${m.status}: ${(m.progress * 100).toFixed(0)}%`)
            }
        );

        const ocrDuration = Math.round(performance.now() - ocrStart);
        const totalWorkerDuration = Math.round(performance.now() - preprocessingStart);

        console.log(`[ocrWorker] OCR successful. Character count: ${data.text?.length || 0}. Confidence: ${data.confidence}%`);

        // 6. Return results, metadata and stages completed back to main thread
        parentPort.postMessage({
            success: true,
            text: data.text || '',
            confidence: Math.round(data.confidence || 0),
            metadata: {
                width,
                height,
                preprocessingDuration,
                ocrDuration,
                totalWorkerDuration,
                hasResized,
                binarized: true,
                autoRotated: true,
                noiseCleaned: true
            }
        });

    } catch (error) {
        console.error('[ocrWorker] Thread execution crashed:', error);
        parentPort.postMessage({
            success: false,
            error: error.message || 'Worker thread failed execution'
        });
    }
}

processWorkerOcr();
