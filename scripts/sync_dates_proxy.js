const { pg } = require('@vercel/postgres');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const PROXY_URL = 'http://127.0.0.1:8787'; // Assuming proxy is local or use ENV
const PROXY_KEY = 'brownstreet-proxy-key';

const bcrypt = require('bcryptjs');

async function getAccessToken() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const timestamp = Date.now().toString();

    // Create signature like in src/lib/naver/auth.ts
    const h = bcrypt.hashSync(`${clientId}_${timestamp}`, clientSecret);
    const signature = Buffer.from(h).toString('base64');

    const body = {
        client_id: clientId,
        timestamp: timestamp,
        grant_type: 'client_credentials',
        client_secret_sign: signature,
        type: 'SELF'
    };

    const res = await fetch(`${PROXY_URL}/naver/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('Token response:', data);
    return data.access_token;
}

async function sync() {
    try {
        console.log('Fetching access token...');
        const token = await getAccessToken();
        if (!token) {
            console.error('Failed to get token');
            return;
        }

        console.log('Searching products via proxy...');
        // We might need to iterate multiple pages if there are many products
        let allProducts = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            console.log(`Fetching page ${page}...`);
            const naverRes = await fetch(`${PROXY_URL}/v1/products/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'x-proxy-key': PROXY_KEY
                },
                body: JSON.stringify({
                    page: page,
                    size: 100,
                    saleStatus: 'ON_SALE' // Filter for active products
                })
            });
            const naverData = await naverRes.json();

            if (naverData.contents) {
                allProducts = allProducts.concat(naverData.contents);
                totalPages = Math.ceil(naverData.total / 100);
                page++;
            } else {
                console.log('No contents on page', page, naverData);
                break;
            }

            if (page > 10) break; // Safety limit
        }

        if (allProducts.length === 0) {
            console.log('No products found.');
            return;
        }

        console.log(`Found ${allProducts.length} products. Updating database...`);
        const pool = pg.createPool({ connectionString: process.env.POSTGRES_URL });
        let count = 0;

        for (const item of allProducts) {
            const cp = item.channelProducts?.[0];
            const sellerManagementCode = cp?.sellerManagementCode;
            const regDate = cp?.regDate;

            if (sellerManagementCode && regDate) {
                // Parse date to clean string
                const formattedDate = new Date(regDate).toISOString();
                const res = await pool.query(
                    'UPDATE products SET master_reg_date = $1 WHERE id = $2',
                    [formattedDate, sellerManagementCode]
                );
                if (res.rowCount > 0) {
                    count++;
                }
            }
        }

        console.log(`Successfully synced ${count} product registration dates.`);
        await pool.end();
    } catch (e) {
        console.error('Sync error:', e);
    }
}

sync();
