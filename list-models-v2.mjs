import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.production' });

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const names = data.models.map(m => m.name);
        fs.writeFileSync('available-models.json', JSON.stringify(names, null, 2));
        console.log('Saved to available-models.json');
    } catch (e) {
        console.error(e.message);
    }
}

listModels();
