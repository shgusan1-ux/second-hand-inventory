
import { createClient } from '@libsql/client';
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

        const tursoUrl = getVal('TURSO_DATABASE_URL');
        const tursoToken = getVal('TURSO_AUTH_TOKEN');
        const GEMINI_API_KEY = getVal('GEMINI_API_KEY');

        console.log('Turso:', tursoUrl);
        const client = createClient({ url: tursoUrl, authToken: tursoToken });

        const countRes = await client.execute('SELECT COUNT(*) as cnt FROM custom_brands');
        console.log('Count:', countRes.rows[0].cnt);

        const latest = await client.execute('SELECT id, brand_name FROM custom_brands ORDER BY id DESC LIMIT 1');
        console.log('Latest ID:', latest.rows[0]?.id, 'Name:', latest.rows[0]?.brand_name);

        // Test multiple endpoints
        const endpoints = [
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`
        ];

        for (const url of endpoints) {
            console.log('\nTesting URL:', url.substring(0, 60) + '...');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] })
            });
            const data = await res.json();
            console.log('Status:', res.status);
            if (data.error) console.log('Error:', data.error.message);
            else console.log('Success!');
        }

    } catch (e) {
        console.log('ERR:', e.message);
    }
}

run();
