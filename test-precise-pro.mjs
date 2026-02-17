import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const API_KEY = process.env.GEMINI_API_KEY;

async function test() {
    const model = 'gemini-3-pro-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    console.log(`Testing ${model}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello, list your name." }] }]
            })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data).substring(0, 200));
    } catch (e) {
        console.error(e);
    }
}

test();
