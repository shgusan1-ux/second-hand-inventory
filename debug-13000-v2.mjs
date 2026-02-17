import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function test() {
    const logFile = 'debug-output-13000-v2.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };

    fs.writeFileSync(logFile, '');

    try {
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
        const id = '13000256670';

        log(`\n--- Test A: Treat ${id} as Origin Product No ---`);
        try {
            const resA = await axios.get(`${PROXY_URL}/v2/products/origin-products/${id}`, { headers });
            log("Success (Origin)!");
            log("Display Categories: " + JSON.stringify(resA.data.smartstoreChannelProduct?.channelProductDisplayCategoryNoList));
        } catch (e) {
            log("Failed (Origin): " + (e.response?.status || e.message));
            if (e.response?.data) log(e.response.data);
        }

        log(`\n--- Test B: Treat ${id} as Channel Product No ---`);
        try {
            const resB = await axios.get(`${PROXY_URL}/v2/products/channel-products/${id}`, { headers });
            log("Success (Channel)!");
            log("Display Categories: " + JSON.stringify(resB.data.channelProductDisplayCategoryNoList));
            log("Full Data (Channel): " + JSON.stringify(resB.data, null, 2));
        } catch (e) {
            log("Failed (Channel): " + (e.response?.status || e.message));
            if (e.response?.data) log(e.response.data);
        }

    } catch (e) {
        log("Critical Error: " + e.message);
    }
}
test();
