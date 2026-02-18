
import { createClient } from '@libsql/client';
import fs from 'fs';

async function run() {
    try {
        const envProd = fs.readFileSync('.env.production', 'utf8');
        const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
        const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";
        const GEMINI_API_KEY = envProd.match(/GEMINI_API_KEY="(.+?)"/)?.[1] || "";

        console.log('Gemini Key length:', GEMINI_API_KEY.length);

        const client = createClient({ url: tursoUrl, authToken: tursoToken });
        const { rows } = await client.execute('SELECT COUNT(*) as count FROM custom_brands');
        console.log('Current brand count:', rows[0].count);

        const prompt = 'List 1 archive brand name.';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        console.log('Calling Gemini...');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        console.log('Response status:', response.status);
        if (data.error) {
            console.log('Gemini Error Object:', JSON.stringify(data.error));
        } else {
            console.log('Gemini Success! Response:', JSON.stringify(data).substring(0, 100));
        }
    } catch (e) {
        console.log('SCRIPT ERROR:', e.message);
        console.log(e.stack);
    }
}

run();
