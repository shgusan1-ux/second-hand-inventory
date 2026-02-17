
const axios = require('axios');
require('dotenv').config();

async function test() {
    const categoryId = 'bedf1e439281477fb6383cfb1770eea9';
    const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
    const client_id = process.env.NAVER_CLIENT_ID;
    const client_secret = process.env.NAVER_CLIENT_SECRET;

    const ports = [3001, 8787];

    for (const port of ports) {
        const url = `http://15.164.216.212:${port}`;
        console.log(`\n--- Testing Proxy at Port ${port} ---`);
        try {
            const tokenRes = await axios.post(`${url}/oauth/token`, {
                client_id,
                client_secret,
                grant_type: 'client_credentials'
            }, {
                headers: { 'x-proxy-key': PROXY_KEY },
                timeout: 5000
            });
            console.log(`Port ${port}: Token OK`);
            const token = tokenRes.data.access_token;

            console.log(`Port ${port}: Fetching Product Details for some product...`);
            // We need a productNo to test. Let's try to search first.
            const searchRes = await axios.post(`${url}/v1/products/search`, {
                page: 1,
                size: 1
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-proxy-key': PROXY_KEY
                }
            });
            console.log(`Port ${port}: Search OK. Found ${searchRes.data.contents?.length || 0} products.`);

        } catch (e) {
            console.log(`Port ${port} failed: ${e.message}`);
        }
    }
}

test();
