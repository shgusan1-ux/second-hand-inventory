import { createClient } from '@libsql/client';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { calculateLifecycle } from './src/lib/classification/lifecycle.ts';
import { classifyArchive } from './src/lib/classification/archive.ts';

dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function runClassification() {
    console.log('--- Batch Classification Logic Execution ---');

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('Missing Naver Credentials');
        return;
    }

    try {
        // 1. Get Token
        const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        const { access_token } = await tokenRes.json();
        console.log('✅ Token Acquired');

        // 2. Fetch all products (approx 1017 items, 100 items per page)
        let allProducts = [];
        console.log('Fetching all products from Naver...');
        for (let page = 0; page < 11; page++) {
            const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ page, size: 100 })
            });
            const data = await searchRes.json();
            if (data.contents) {
                allProducts = allProducts.concat(data.contents);
            }
            console.log(`Page ${page} fetched: ${data.contents?.length || 0} items`);
        }
        console.log(`✅ Total Products Fetched: ${allProducts.length}`);

        // 3. Apply Classification Logic
        console.log('\nProcessing classification...');
        const stats = {
            NEW: 0,
            CURATED: 0,
            ARCHIVE: {
                total: 0,
                MILITARY: 0,
                WORKWEAR: 0,
                JAPAN: 0,
                EUROPE: 0,
                BRITISH: 0,
                UNCATEGORIZED: 0
            },
            CLEARANCE: 0
        };

        const dbClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

        // Get existing overrides
        const { rows: overrides } = await dbClient.execute('SELECT * FROM product_overrides');
        const overrideMap = overrides.reduce((acc, row) => {
            acc[row.id] = row;
            return acc;
        }, {});

        for (const p of allProducts) {
            const cp = p.channelProducts?.[0];
            if (!cp) continue;

            const prodId = p.originProductNo.toString();
            const prodName = cp.name;
            const regDate = cp.regDate;
            const override = overrideMap[prodId] || {};

            // 1. Lifecycle Stage
            const lifecycle = calculateLifecycle(regDate, override.override_date);
            if (lifecycle.stage === 'NEW') stats.NEW++;
            else if (lifecycle.stage === 'CURATED') stats.CURATED++;
            else if (lifecycle.stage === 'CLEARANCE') stats.CLEARANCE++;
            else if (lifecycle.stage === 'ARCHIVE') stats.ARCHIVE.total++;

            // 2. Archive Sub-classification (Check for all items to see distribution)
            const archive = classifyArchive(prodName, []);
            stats.ARCHIVE[archive.category]++;
        }

        // 4. Report Results
        console.log('\n--- Real-time Lifecycle Stats ---');
        console.log(`NEW (0-30 days): ${stats.NEW}`);
        console.log(`CURATED (31-60 days): ${stats.CURATED}`);
        console.log(`ARCHIVE (61-150 days): ${stats.ARCHIVE.total}`);
        console.log(`CLEARANCE (150+ days): ${stats.CLEARANCE}`);

        console.log('\n--- Sub-category Distribution (Keyword Matching) ---');
        console.log(`MILITARY: ${stats.ARCHIVE.MILITARY}`);
        console.log(`WORKWEAR: ${stats.ARCHIVE.WORKWEAR}`);
        console.log(`JAPAN: ${stats.ARCHIVE.JAPAN}`);
        console.log(`EUROPE: ${stats.ARCHIVE.EUROPE}`);
        console.log(`BRITISH: ${stats.ARCHIVE.BRITISH}`);
        console.log(`UNCATEGORIZED: ${stats.ARCHIVE.UNCATEGORIZED}`);

        console.log('\n✅ Logic verification complete.');

    } catch (e) {
        console.error('Error during classification execution:', e);
    }
}

runClassification();
