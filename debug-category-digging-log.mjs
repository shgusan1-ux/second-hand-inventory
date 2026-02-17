import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const TARGET_CAT_ID = '09f56197c74b4969ac44a18a7b5f8fb1';

async function test() {
    const logFile = 'debug-cat-output.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };
    fs.writeFileSync(logFile, '');

    try {
        log(`Using Proxy: ${PROXY_URL}`);
        log("Fetching token...");
        const tokenRes = await axios.post(`${PROXY_URL}/oauth/token`, {
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        }, {
            headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY }
        });
        const token = tokenRes.data.access_token;
        const headers = { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY };

        log("Token obtained.");

        log(`\n--- Test 1: GET /v1/display-categories/${TARGET_CAT_ID}/products ---`);
        try {
            const res1 = await axios.get(`${PROXY_URL}/v1/display-categories/${TARGET_CAT_ID}/products`, { headers });
            log("Result: " + res1.status);
            log(res1.data);
        } catch (e) {
            log("Failed: " + e.response?.status + " " + e.response?.statusText);
            if (e.response?.data) log(e.response.data);
        }

        log(`\n--- Test 2: GET /v1/display-categories/${TARGET_CAT_ID} ---`);
        try {
            const res2 = await axios.get(`${PROXY_URL}/v1/display-categories/${TARGET_CAT_ID}`, { headers });
            log("Result: " + res2.status);
            log(res2.data);
        } catch (e) {
            log("Failed: " + e.response?.status + " " + e.response?.statusText);
            if (e.response?.data) log(e.response.data);
        }

        log(`\n--- Test 3: POST /v1/products/search with displayCategoryId ---`);
        try {
            const res3 = await axios.post(`${PROXY_URL}/v1/products/search`, {
                displayCategoryId: TARGET_CAT_ID,
                productStatusTypes: ['SALE', 'OUTOFSTOCK'],
                page: 1,
                size: 5
            }, { headers });
            log("Result Total: " + res3.data?.totalElements);
            if (res3.data?.contents) {
                log("Contents count: " + res3.data.contents.length);
                log(res3.data.contents[0]);
            }
        } catch (e) {
            log("Failed: " + e.response?.status + " " + e.response?.statusText);
            if (e.response?.data) log(e.response.data);
        }

    } catch (e) {
        log("Critical Error: " + (e.message));
    }
}
test();
