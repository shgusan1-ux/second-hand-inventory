import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:8787';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

async function getToken() {
    const res = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });
    const data = await res.json();
    return data.access_token;
}

async function verify() {
    console.log('--- STARTING CATEGORY CROSS-VERIFICATION ---');
    let token;
    try {
        token = await getToken();
        console.log('✅ Token obtained.');
    } catch (e) {
        console.error('❌ Failed to get token:', e.message);
        return;
    }

    // 1. Fetch Exhibition Categories
    console.log('Fetching Store Categories...');
    try {
        const catRes = await fetch(`${PROXY_URL}/v1/product-channels/smartstore/categories`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
        });

        if (!catRes.ok) {
            const errText = await catRes.text();
            throw new Error(`Category fetch failed: ${catRes.status} - ${errText}`);
        }

        const categories = await catRes.json();
        const catMap = {};
        if (Array.isArray(categories)) {
            categories.forEach(c => catMap[c.categoryId] = c.categoryName);
            console.log(`✅ Found ${categories.length} store categories.`);
        } else {
            console.warn('⚠️ Categories response is not an array:', categories);
        }

        // 2. Fetch All Products (max items)
        console.log('Fetching All Products (up to 1200)...');
        let allProducts = [];
        for (let page = 0; page < 12; page++) {
            const res = await fetch(`${PROXY_URL}/v1/products/search`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
                body: JSON.stringify({ page, size: 100 })
            });
            const data = await res.json();
            if (!data.contents || data.contents.length === 0) break;
            allProducts = allProducts.concat(data.contents);
            process.stdout.write(`(${allProducts.length})`);
        }
        console.log(`\n✅ Total Products Fetched: ${allProducts.length}`);

        // 3. Count by Exhibition Category
        const exhibitionCounts = {};
        const unclassified = [];

        allProducts.forEach(p => {
            const catIds = p.exhibitionCategoryIds || [];
            if (catIds.length === 0) {
                unclassified.push(p);
            } else {
                catIds.forEach(id => {
                    exhibitionCounts[id] = (exhibitionCounts[id] || 0) + 1;
                });
            }
        });

        console.log('\n--- DISTRIBUTION BY EXHIBITION CATEGORY (SMARTSTORE) ---');
        const results = Object.entries(exhibitionCounts).map(([id, count]) => ({
            id,
            name: catMap[id] || 'Unknown',
            count
        })).sort((a, b) => b.count - a.count);

        console.table(results);
        console.log(`\nUnclassified in Exhibition Categories: ${unclassified.length}`);

        // Check specific names
        const matches = results.filter(r => r.name.includes('NEW') || r.name.includes('CURATED') || r.name.includes('신상품') || r.name.includes('기획전'));
        console.log('\nInteresting Categories:');
        console.table(matches);

    } catch (e) {
        console.error('❌ Verification Process Failed:', e.message);
    }
}

verify().catch(console.error);
