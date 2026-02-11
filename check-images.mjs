import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;

async function run() {
    const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: 'unused' })
    });
    const { access_token } = await tokenRes.json();

    const res = await fetch(`${PROXY_URL}/v1/products/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, size: 3, productStatusTypes: ['SALE'] })
    });
    const data = await res.json();

    for (const p of data.contents.slice(0, 3)) {
        const cp = p.channelProducts[0];
        console.log(`${cp.name?.substring(0, 40)}`);
        console.log('  representativeImage:', JSON.stringify(cp.representativeImage));
        console.log('');
    }
}
run().catch(console.error);
