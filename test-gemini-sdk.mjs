
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';

async function run() {
    try {
        const envProd = fs.readFileSync('.env.production', 'utf8');
        const getVal = (key) => {
            const line = envProd.split('\n').find(l => l.includes(key + '='));
            if (!line) return '';
            const match = line.match(new RegExp(`${key}="(.+?)"`));
            return match ? match[1].replace(/\\n/g, '').trim() : '';
        };

        const GEMINI_API_KEY = getVal('GEMINI_API_KEY');
        console.log('Using Key:', GEMINI_API_KEY.substring(0, 10) + '...');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log('Requesting Gemini...');
        const result = await model.generateContent("Recommend 1 fashion brand.");
        const response = await result.response;
        const text = response.text();
        console.log('Success! Text:', text);

    } catch (e) {
        console.log('SDK ERROR:', e.message);
    }
}

run();
