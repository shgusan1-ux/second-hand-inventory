import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function test() {
    const logFile = 'debug-tag-search-v2.txt';
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

        // Correct Enum Value: 'PRODUCT_NAME' should be correct but earlier failed?
        // Let's try omitting 'searchKeywordType' if 'searchKeyword' is present, or check docs.
        // Usually: PRODUCT_NAME, SELLER_MANAGEMENT_CODE ... etc.
        // Maybe I sent it wrong.

        // Actually, 'tags' are not searchable.
        // But if we put a tag in the 'Product Name' itself like "[CLEARANCE] Item Name", we can search it.

        // Let's try to search specifically for a known term to verify search works.
        log(`\n--- Test A: Search for '니트' (Knit) in PRODUCT_NAME ---`);
        const resA = await axios.post(`${PROXY_URL}/v1/products/search`, {
            searchKeyword: '니트',
            searchKeywordType: 'PRODUCT_NAME',
            productStatusTypes: ['SALE'],
            page: 1, size: 3
        }, { headers });
        log("Count A: " + resA.data?.totalElements);

        // Test B: SELLER_MANAGE_CODE
        // Let's see if we can search partial matches there.
        log(`\n--- Test B: Search 'F0223' in SELLER_MANAGEMENT_CODE ---`);
        try {
            const resB = await axios.post(`${PROXY_URL}/v1/products/search`, {
                searchKeyword: 'F0223',
                searchKeywordType: 'SELLER_MANAGEMENT_CODE',
                productStatusTypes: ['SALE'],
                page: 1, size: 3
            }, { headers });
            log("Count B: " + resB.data?.totalElements);
        } catch (e) { log("Failed B: " + e.response?.data?.message); }

    } catch (e) {
        log("Error: " + (e.message));
        if (e.response?.data) log(e.response.data);
    }
}
test();
