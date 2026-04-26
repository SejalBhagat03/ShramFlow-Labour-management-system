const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testGemini() {
    console.log("Testing Gemini API...");
    console.log("Key length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
    
    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is missing!");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

    for (const modelName of models) {
        try {
            console.log(`Trying ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hello, are you working?");
            const response = await result.response;
            console.log(`Response from ${modelName}:`, response.text());
            return;
        } catch (err) {
            console.error(`${modelName} failed:`, err.message);
        }
    }
}

testGemini();
