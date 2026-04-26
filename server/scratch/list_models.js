const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    console.log("Listing available Gemini models...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    try {
        // The listModels method is on the client, not the genAI object directly in some versions
        // Actually, in @google/generative-ai, we might need to use a different approach or just test specific names.
        // Let's try the common names.
        const testModels = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        for (const name of testModels) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                await model.generateContent("test");
                console.log(`✅ ${name} is available`);
            } catch (e) {
                console.log(`❌ ${name} failed: ${e.message.split('\n')[0]}`);
            }
        }
    } catch (err) {
        console.error("Error listing models:", err);
    }
}

listModels();
