import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

async function getToken() {
    const res = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });
    const data = await res.json();
    return data.access_token;
}

async function findCategories() {
    const token = await getToken();
    console.log('Fetching first 200 products to find category IDs...');

    let allCatIds = new Set();

    for (let page = 0; page < 2; page++) {
        const res = await fetch(`${PROXY_URL}/v1/products/search`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
            body: JSON.stringify({ page, size: 100 })
        });
        const data = await res.json();
        data.contents.forEach(p => {
            if (p.exhibitionCategoryIds) {
                p.exhibitionCategoryIds.forEach(id => allCatIds.add(id));
            }
        });
    }

    console.log('Unique Exhibition Category IDs found:', Array.from(allCatIds));
}

findCategories().catch(console.error);
