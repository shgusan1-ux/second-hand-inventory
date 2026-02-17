import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Override with port 3001 for this test, as 8787 failed
const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const TARGET_CAT_ID = '09f56197c74b4969ac44a18a7b5f8fb1';

async function test() {
    try {
        console.log(`Using Proxy: ${PROXY_URL}`);
        console.log("Fetching token...");
        const tokenRes = await axios.post(`${PROXY_URL}/oauth/token`, {
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        }, {
            headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY }
        });
        const token = tokenRes.data.access_token;
        const headers = { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY };

        console.log("Token obtained.");

        // Try getting ALL products distribution by category? No, too heavy.

        // 1. Try to search normally and check one product's raw JSON for hints
        console.log(`\n--- Test 0: Search products (1 page) to inspect structure ---`);
        const searchRes = await axios.post(`${PROXY_URL}/v1/products/search`, {
            page: 1,
            size: 1,
            productStatusTypes: ['SALE']
        }, { headers });
        if (searchRes.data.contents?.length > 0) {
            console.log("Sample Product:", JSON.stringify(searchRes.data.contents[0], null, 2));
        }

        // 2. Try specific display category endpoint if exists (guessing)
        // Since Naver has 'v1/display-categories' typically for GFA or other services, maybe not Commerce.
        // But smartstore has its own internal APIs.

        // Let's try to fetch a product I know is in CLEARANCE if I knew one...
        // User provided link: https://smartstore.naver.com/brownstreet/category/09f56197c74b4969ac44a18a7b5f8fb1
        // This is a "User defined category" (전시 카테고리).

        // API documentation for Smartstore usually allows managing these via "Exhibition" APIs but reading products *by* them is tricky.

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Response:", e.response.status, e.response.data);
    }
}
test();
