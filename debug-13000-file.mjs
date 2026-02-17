import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001'; // Defaulting to 3001 as 8787 failed
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

async function test() {
    const logFile = 'debug-output-13000.txt';
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };

    fs.writeFileSync(logFile, ''); // Clear file

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

        const productNo = '13000256670';

        log(`Checking Origin Product Detail for ${productNo}...`);
        const originRes = await axios.get(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
        });

        log("Origin Exhibition IDs: " + JSON.stringify(originRes.data.smartstoreChannelProduct?.channelProductDisplayCategoryNoList));

        const channelProductNo = originRes.data.smartstoreChannelProduct?.channelProductNo;
        if (channelProductNo) {
            log(`Checking Channel Product Detail for ${channelProductNo}...`);
            const channelRes = await axios.get(`${PROXY_URL}/v2/products/channel-products/${channelProductNo}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
            });
            log("Channel Exhibition IDs: " + JSON.stringify(channelRes.data.channelProductDisplayCategoryNoList));
            log("\n--- Full Channel Response ---");
            log(channelRes.data);
        } else {
            log("No Channel Product No found.");
        }
    } catch (e) {
        log("Error: " + (e.response?.data?.message || e.message));
        if (e.response?.data) log(e.response.data);
    }
}
test();
