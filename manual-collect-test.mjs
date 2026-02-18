
import { createClient } from '@libsql/client';
import fs from 'fs';

const envProd = fs.readFileSync('.env.production', 'utf8');
const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";
const GEMINI_API_KEY = envProd.match(/GEMINI_API_KEY="(.+?)"/)?.[1] || "";

async function triggerCollection() {
    console.log('Manually triggering brand collection...');
    const client = createClient({ url: tursoUrl, authToken: tursoToken });

    try {
        const { rows: existingBrands } = await client.execute('SELECT brand_name FROM custom_brands');
        const existingNames = existingBrands.map(b => b.brand_name.toUpperCase());
        console.log(`Currently have ${existingNames.length} brands in DB.`);

        const prompt = `Recommend 5 NEW high-end/archive fashion brands (distinctive value) for a second-hand inventory system.
        Exclude common ones and these: ${existingNames.slice(0, 50).join(', ')}
        Return ONLY a JSON array: [{"brand_name": "...", "brand_name_ko": "...", "tier": "...", "country": "...", "aliases": []}]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(`Gemini Error: ${JSON.stringify(data.error)}`);

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const newBrands = JSON.parse(jsonStr);

        console.log(`AI suggested ${newBrands.length} brands:`, newBrands.map(b => b.brand_name).join(', '));

        let saved = 0;
        for (const brand of newBrands) {
            const res = await client.execute({
                sql: "INSERT INTO custom_brands (brand_name, brand_name_ko, aliases, tier, country, is_active) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(brand_name) DO NOTHING",
                args: [brand.brand_name.toUpperCase(), brand.brand_name_ko, JSON.stringify(brand.aliases || []), brand.tier, brand.country]
            });
            if (res.rowsAffected > 0) saved++;
        }
        console.log(`Successfully saved ${saved} new brands to Turso.`);

    } catch (e) {
        console.error('Trigger failed:', e);
    }
}

triggerCollection();
