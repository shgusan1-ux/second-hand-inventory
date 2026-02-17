import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function test() {
    const logFile = 'debug-tag-search.txt';
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

        // Try searching by specific tag if possible?
        // Naver Search API has 'searchKeywordType', let's see valid values.
        // Valid values: PRODUCT_NAME, SELLER_CODE, CHANNEL_PRODUCT_NO, ORIGIN_PRODUCT_NO, MODEL_NAME
        // No tag search directly...

        // HOWEVER, if we search "keyword" in PRODUCT_NAME, it works.
        // What if we search keyword in general?

        const testKeyword = 'CLEARANCE';
        log(`\n--- Test A: Search for '${testKeyword}' in PRODUCT_NAME ---`);
        const resA = await axios.post(`${PROXY_URL}/v1/products/search`, {
            searchKeyword: testKeyword,
            searchKeywordType: 'PRODUCT_NAME',
            productStatusTypes: ['SALE', 'OUTOFSTOCK'],
            page: 1, size: 5
        }, { headers });
        log("Count: " + resA.data?.totalElements);

        // Can we search by 'MANAGEMENT_CODE' (Seller Code)?
        // If we put a special code in 'sellerManagementCode' for Clearance items.
        // e.g. "CLR-001"

        // Check current seller codes
        log(`\n--- Test B: Check sample seller codes ---`);
        const resB = await axios.post(`${PROXY_URL}/v1/products/search`, {
            page: 1, size: 5,
            productStatusTypes: ['SALE']
        }, { headers });
        resB.data?.contents?.forEach(p => {
            const cp = p.channelProducts?.[0];
            log(`ID: ${p.originProductNo}, Code: ${cp?.sellerManagementCode}, Name: ${cp?.name}`);
        });

    } catch (e) {
        log("Error: " + (e.message));
        if (e.response?.data) log(e.response.data);
    }
}
test();
