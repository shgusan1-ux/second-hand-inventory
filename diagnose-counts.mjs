
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

async function run() {
    const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET })
    });
    const { access_token } = await tokenRes.json();
    let all = [];
    let page = 0;
    let totalElements = 0;
    do {
        const res = await fetch(`${PROXY_URL}/v1/products/search`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ page, size: 100 })
        });
        const data = await res.json();
        if (!data.contents) break;
        all = all.concat(data.contents);
        totalElements = data.totalElements;
        page++;
    } while (all.length < totalElements && page < 20);

    const stats = { NEW: 0, CURATED: 0, ARCHIVE: 0, CLEARANCE: 0 };
    const now = Date.now();
    all.forEach(p => {
        const regDate = p.channelProducts?.[0]?.regDate;
        if (!regDate) return;
        const days = Math.floor((now - new Date(regDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 30) stats.NEW++;
        else if (days <= 60) stats.CURATED++;
        else if (days <= 150) stats.ARCHIVE++;
        else stats.CLEARANCE++;
    });
    console.log('TOTAL:', all.length);
    console.log('NEW:', stats.NEW);
    console.log('CURATED:', stats.CURATED);
    console.log('ARCHIVE:', stats.ARCHIVE);
    console.log('CLEARANCE:', stats.CLEARANCE);
}
run();
