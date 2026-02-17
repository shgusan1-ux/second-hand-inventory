
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TARGET_CAT_ID = 'bedf1e439281477fb6383cfb1770eea9';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const PROXY_URL = 'http://15.164.216.212:3001';

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
        console.log("Token obtained.");

        console.log(`\n--- Searching with displayCategoryId: ${TARGET_CAT_ID} ---`);
        const res = await axios.post(`${PROXY_URL}/v1/products/search`, {
            page: 1,
            size: 10,
            displayCategoryId: TARGET_CAT_ID
        }, { headers });

        console.log("Search Status:", res.status);
        console.log("Total elements:", res.data?.totalElements);
        console.log("Contents length:", res.data?.contents?.length || 0);

        if (res.data?.contents?.length > 0) {
            console.log("First 3 products:");
            res.data.contents.slice(0, 3).forEach(p => console.log(` - ${p.originProductNo}: ${p.name}`));
        } else {
            console.log("No products found for this exhibition category.");

            // Try alternate field name 'categoryId' instead of 'displayCategoryId'
            console.log(`\n--- Searching with categoryId: ${TARGET_CAT_ID} ---`);
            const res2 = await axios.post(`${PROXY_URL}/v1/products/search`, {
                page: 1,
                size: 10,
                categoryId: TARGET_CAT_ID
            }, { headers });
            console.log("Search2 Status:", res2.status);
            console.log("Search2 Total:", res2.data?.totalElements);
        }

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error("Response:", e.response.status, e.response.data);
    }
}
test();
