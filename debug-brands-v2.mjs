
import { createClient } from '@libsql/client';
import fs from 'fs';

async function run() {
    try {
        const envProd = fs.readFileSync('.env.production', 'utf8');
        // Better parsing
        const lines = envProd.split('\n');
        const getVal = (key) => {
            const line = lines.find(l => l.startsWith(key + '='));
            if (!line) return '';
            let val = line.split('=')[1].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
            // Replace literal \n if exists
            return val.replace(/\\n$/, '').trim();
        };

        const tursoUrl = getVal('TURSO_DATABASE_URL');
        const tursoToken = getVal('TURSO_AUTH_TOKEN');
        const GEMINI_API_KEY = getVal('GEMINI_API_KEY');

        console.log('Turso URL:', tursoUrl);
        console.log('Gemini Key prefix:', GEMINI_API_KEY.substring(0, 10));

        const client = createClient({ url: tursoUrl, authToken: tursoToken });
        const { rows } = await client.execute('SELECT COUNT(*) as count FROM custom_brands');
        console.log('Real Turso brand count:', rows[0].count);

        // Try v1 instead of v1beta
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        console.log('Calling Gemini v1...');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'List 1 archive brand name.' }] }] })
        });

        const data = await response.json();
        console.log('Status:', response.status);
        if (data.error) {
            console.log('Error:', JSON.stringify(data.error));
        } else {
            console.log('Success! Text:', data.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

run();
