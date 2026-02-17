
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Testing both known ports
const ports = [3001, 8787];
const TARGET_CAT_ID = 'bedf1e439281477fb6383cfb1770eea9';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function test() {
    for (const port of ports) {
        const url = `http://15.164.216.212:${port}`;
        console.log(`\n========== Testing Proxy at Port ${port} ==========`);
        try {
            console.log("Fetching token...");
            const tokenRes = await axios.post(`${url}/oauth/token`, {
                client_id: process.env.NAVER_CLIENT_ID,
                client_secret: process.env.NAVER_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }, {
                headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
                timeout: 5000
            });
            const token = tokenRes.data.access_token;
            const headers = { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY };
            console.log("Token acquired.");

            console.log(`\n--- Test: GET /v1/display-categories/${TARGET_CAT_ID} ---`);
            try {
                const res = await axios.get(`${url}/v1/display-categories/${TARGET_CAT_ID}`, { headers });
                console.log("Category Info:", res.status, JSON.stringify(res.data, null, 2));
            } catch (e) {
                console.log("Category Info Failed:", e.response?.status, e.response?.data || e.message);
            }

            console.log(`\n--- Test: GET /v1/display-categories/${TARGET_CAT_ID}/products ---`);
            try {
                const res = await axios.get(`${url}/v1/display-categories/${TARGET_CAT_ID}/products`, { headers });
                console.log("Products Result:", res.status, `Total: ${res.data?.totalElements || res.data?.contents?.length || 0}`);
                if (res.data?.contents) {
                    res.data.contents.slice(0, 3).forEach(p => console.log(` - ${p.originProductNo}: ${p.name}`));
                }
            } catch (e) {
                console.log("Products Fetch Failed:", e.response?.status, e.response?.data || e.message);
            }

        } catch (e) {
            console.log(`Critical failure for port ${port}:`, e.message);
        }
    }
}
test();
