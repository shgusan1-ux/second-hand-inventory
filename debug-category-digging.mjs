import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:8787';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const TARGET_CAT_ID = '09f56197c74b4969ac44a18a7b5f8fb1';

async function test() {
    try {
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

        console.log(`\n--- Test 1: GET /v1/display-categories/${TARGET_CAT_ID}/products ---`);
        try {
            const res1 = await axios.get(`${PROXY_URL}/v1/display-categories/${TARGET_CAT_ID}/products`, { headers });
            console.log("Result:", res1.status, res1.data);
        } catch (e) {
            console.log("Failed:", e.response?.status, e.response?.statusText);
        }

        console.log(`\n--- Test 2: GET /v1/display-categories/${TARGET_CAT_ID} ---`);
        try {
            const res2 = await axios.get(`${PROXY_URL}/v1/display-categories/${TARGET_CAT_ID}`, { headers });
            console.log("Result:", res2.status, res2.data);
        } catch (e) {
            console.log("Failed:", e.response?.status, e.response?.statusText);
        }

        console.log(`\n--- Test 3: POST /v1/products/search with displayCategoryId ---`);
        try {
            const res3 = await axios.post(`${PROXY_URL}/v1/products/search`, {
                displayCategoryId: TARGET_CAT_ID,
                productStatusTypes: ['SALE', 'OUTOFSTOCK']
            }, { headers });
            console.log("Result:", res3.status, res3.data?.totalElements);
        } catch (e) {
            console.log("Failed:", e.response?.status, e.response?.statusText, e.response?.data);
        }

    } catch (e) {
        console.error("Critical Error:", e.message);
    }
}
test();
