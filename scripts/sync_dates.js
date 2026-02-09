const { pg } = require('@vercel/postgres');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function getAccessToken() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const body = {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
    };
    const res = await axios.post('https://api.commerce.naver.com/external/v1/oauth2/token', body);
    return res.data.access_token;
}

async function sync() {
    try {
        const token = await getAccessToken();
        const naverRes = await axios.post('https://api.commerce.naver.com/external/v1/products/search',
            { page: 1, size: 1000 },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!naverRes.data?.contents) return;

        const db = pg.createPool({ connectionString: process.env.POSTGRES_URL });
        let count = 0;
        for (const item of naverRes.data.contents) {
            const cp = item.channelProducts?.[0];
            if (cp?.sellerManagementCode && cp.regDate) {
                const res = await db.query('UPDATE products SET master_reg_date = $1 WHERE id = $2', [cp.regDate, cp.sellerManagementCode]);
                if (res.rowCount > 0) count++;
            }
        }
        console.log(`Updated ${count} products.`);
        await db.end();
    } catch (e) {
        console.error(e.message);
    }
}

sync();
