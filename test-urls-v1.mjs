import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const API_KEY = process.env.GEMINI_API_KEY;

async function testUrl(url, name) {
    console.log(`Testing ${name}: ${url}`);
    try {
        const res = await fetch(`${url}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hi" }] }]
            })
        });
        console.log(`${name} Status:`, res.status);
        if (!res.ok) {
            console.log(`${name} Error:`, (await res.text()).substring(0, 200));
        } else {
            const data = await res.json();
            console.log(`${name} Success:`, JSON.stringify(data).substring(0, 100));
        }
    } catch (e) {
        console.error(`${name} Fetch Error:`, e.message);
    }
}

async function run() {
    await testUrl('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent', 'Gemini 1.5 Pro (v1)');
    await testUrl('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent', 'Gemini 1.5 Flash (v1)');
}

run();
