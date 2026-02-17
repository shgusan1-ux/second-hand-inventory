import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    console.log(`Listing models: ${url}`);
    try {
        const res = await fetch(url);
        console.log(`Status:`, res.status);
        const data = await res.json();
        console.log(`Models:`, JSON.stringify(data, null, 2).substring(0, 1000));
    } catch (e) {
        console.error(`Error:`, e.message);
    }
}

listModels();
