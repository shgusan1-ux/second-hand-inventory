import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function test() {
    const logFile = 'debug-count-check.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
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

        log(`\n--- Test A: Search with displayCategoryId (CLEARANCE ID) ---`);
        const resA = await axios.post(`${PROXY_URL}/v1/products/search`, {
            displayCategoryId: '09f56197c74b4969ac44a18a7b5f8fb1',
            productStatusTypes: ['SALE', 'OUTOFSTOCK'],
            page: 1, size: 1
        }, { headers });
        log("Count A: " + resA.data?.totalElements);

        log(`\n--- Test B: Search WITHOUT displayCategoryId (All Products) ---`);
        const resB = await axios.post(`${PROXY_URL}/v1/products/search`, {
            productStatusTypes: ['SALE', 'OUTOFSTOCK'],
            page: 1, size: 1
        }, { headers });
        log("Count B: " + resB.data?.totalElements);

        if (resA.data?.totalElements === resB.data?.totalElements) {
            log("\nCONCLUSION: The 'displayCategoryId' parameter was IGNORED. API returned all products.");
        } else {
            log("\nCONCLUSION: The 'displayCategoryId' parameter WORKED!");
        }

    } catch (e) {
        log("Error: " + (e.message));
    }
}
test();
