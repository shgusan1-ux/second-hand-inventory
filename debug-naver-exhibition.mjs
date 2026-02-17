import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:8787';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';

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

        // Find a product locally first to get a real ID
        // I'll just hardcode 11624467324 which seemed to be used before.
        const productNo = 11624467324;

        console.log(`Checking Origin Product Detail for ${productNo}...`);
        const originRes = await axios.get(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
        });

        console.log("Origin API Response structure (smartstoreChannelProduct keys):", Object.keys(originRes.data.smartstoreChannelProduct || {}));
        console.log("Exhibition IDs (Origin GET):", originRes.data.smartstoreChannelProduct?.channelProductDisplayCategoryNoList);

        const channelProductNo = originRes.data.smartstoreChannelProduct?.channelProductNo;
        if (channelProductNo) {
            console.log(`Checking Channel Product Detail for ${channelProductNo}...`);
            const channelRes = await axios.get(`${PROXY_URL}/v2/products/channel-products/${channelProductNo}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
            });
            console.log("Channel API Response structure keys:", Object.keys(channelRes.data || {}));
            console.log("Exhibition IDs (Channel GET):", channelRes.data.channelProductDisplayCategoryNoList);
        }
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
test();
