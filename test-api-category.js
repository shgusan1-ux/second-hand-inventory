
const axios = require('axios');
require('dotenv').config();

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function checkCategory() {
    const categoryId = 'bedf1e439281477fb6383cfb1770eea9';
    try {
        console.log('--- Fetching Token ---');
        const tokenRes = await axios.post(`${PROXY_URL}/oauth/token`, {
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        }, {
            headers: { 'x-proxy-key': PROXY_KEY }
        });
        const token = tokenRes.data.access_token;
        console.log('Token acquired.');

        console.log('\n--- Fetching Categories ---');
        const catRes = await axios.get(`${PROXY_URL}/v1/categories`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-proxy-key': PROXY_KEY
            }
        });

        const categories = catRes.data;
        console.log(`Fetched ${categories.length} categories.`);

        const target = categories.find(c => c.id === categoryId || c.categoryId === categoryId);
        if (target) {
            console.log('Category found in Naver API response:', target);
        } else {
            console.log('Category NOT found in standard Naver categories list.');
            console.log('Note: If this is a custom exhibition category, it might not show up here.');
        }

        // Try searching products in this category? 
        // Standard search doesn't support exhibition category filtering directly via standard classification IDs usually.
        // But let's check if the proxy provides a way to list products by exhibition category.

    } catch (e) {
        console.error('API Error:', e.response ? e.response.data : e.message);
    }
}

checkCategory();
