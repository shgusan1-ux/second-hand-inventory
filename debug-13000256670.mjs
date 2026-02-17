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

        const productNo = '13000256670';

        console.log(`Checking Origin Product Detail for ${productNo}...`);
        const originRes = await axios.get(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
        });

        console.log("Origin Exhibition IDs:", originRes.data.smartstoreChannelProduct?.channelProductDisplayCategoryNoList);

        const channelProductNo = originRes.data.smartstoreChannelProduct?.channelProductNo;
        if (channelProductNo) {
            console.log(`Checking Channel Product Detail for ${channelProductNo}...`);
            const channelRes = await axios.get(`${PROXY_URL}/v2/products/channel-products/${channelProductNo}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
            });
            console.log("Channel Exhibition IDs:", channelRes.data.channelProductDisplayCategoryNoList);
            console.log("Full Channel Response:", JSON.stringify(channelRes.data, null, 2));
        } else {
            console.log("No Channel Product No found.");
        }
    } catch (e) {
        console.error("Error:", e.response?.data || e.message);
    }
}
test();
