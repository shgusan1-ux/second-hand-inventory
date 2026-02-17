
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TARGET_CAT_ID = 'bedf1e439281477fb6383cfb1770eea9';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const url = 'http://15.164.216.212:3001';

async function test() {
    try {
        const tokenRes = await axios.post(`${url}/oauth/token`, {
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        }, {
            headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY }
        });
        const token = tokenRes.data.access_token;
        const headers = { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY };
        console.log("TOKEN_OK");

        const res = await axios.get(`${url}/v1/display-categories/${TARGET_CAT_ID}`, { headers });
        console.log("CAT_INFO_STATUS:", res.status);
        console.log("CAT_NAME:", res.data?.wholeCategoryName || res.data?.name || "Unknown");

        const resProd = await axios.get(`${url}/v1/display-categories/${TARGET_CAT_ID}/products`, { headers });
        console.log("PROD_COUNT:", resProd.data?.totalElements || resProd.data?.contents?.length || 0);

    } catch (e) {
        console.log("ERROR:", e.response ? e.response.status : e.message);
        if (e.response?.data) console.log("ERROR_DATA:", JSON.stringify(e.response.data));
    }
}
test();
