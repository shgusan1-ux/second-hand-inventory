const { pg } = require('@vercel/postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function getAccessToken() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const res = await fetch('https://api.commerce.naver.com/external/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        })
    });
    const data = await res.json();
    return data.access_token;
}

async function sync() {
    try {
        const token = await getAccessToken();
        const naverRes = await fetch('https://api.commerce.naver.com/external/v1/products/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ page: 1, size: 1000 })
        });
        const naverData = await naverRes.json();

        if (!naverData?.contents) {
            console.log('No contents found.');
            return;
        }

        const pool = pg.createPool({ connectionString: process.env.POSTGRES_URL });
        let count = 0;
        for (const item of naverData.contents) {
            const cp = item.channelProducts?.[0];
            if (cp?.sellerManagementCode && cp.regDate) {
                const res = await pool.query('UPDATE products SET master_reg_date = $1 WHERE id = $2', [cp.regDate, cp.sellerManagementCode]);
                if (res.rowCount > 0) count++;
            }
        }
        console.log(`Updated ${count} products.`);
        await pool.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
}

sync();
