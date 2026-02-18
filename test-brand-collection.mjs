
import { collectDailyBrands } from './src/lib/brand-collector.js'; // Wait, it's a TS file.
// I'll just copy the logic and run it.
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const client = createClient({ url: 'file:inventory.db' });

async function run() {
    console.log('Testing Brand Collection...');
    if (!GEMINI_API_KEY) {
        console.error('No GEMINI_API_KEY found in .env.local');
        return;
    }

    try {
        const { rows: existingBrands } = await client.execute('SELECT brand_name FROM custom_brands');
        const existingNames = existingBrands.map(b => b.brand_name.toUpperCase());
        console.log(`Currently have ${existingNames.length} brands in DB.`);

        const prompt = `Recommend 5 niche fashion brands (distinctive archive value) for a second-hand inventory system.
        Exclude: ${existingNames.slice(0, 10).join(', ')}
        Return ONLY a JSON array: [{"brand_name": "...", "brand_name_ko": "...", "tier": "...", "country": "...", "aliases": []}]`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        console.log('Gemini Response Status:', response.status);
        if (data.error) {
            console.error('Gemini Error:', data.error);
            return;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('Gemini Response Text:', text);

        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const newBrands = JSON.parse(jsonStr);

        console.log(`AI suggested ${newBrands.length} brands.`);
        for (const brand of newBrands) {
            console.log(`- ${brand.brand_name} (${brand.brand_name_ko})`);
        }
    } catch (e) {
        console.error('Run failed:', e);
    }
}

run();
