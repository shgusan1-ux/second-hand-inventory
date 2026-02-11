import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

// Load env
if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
}

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const PROXY_KEY = process.env.SMARTSTORE_PROXY_KEY || 'brownstreet-proxy-key';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

async function runVerification() {
    console.log('Cross-Verifying with Actual API via Proxy...');
    console.log(`Proxy URL: ${PROXY_URL}`);

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET in .env.local');
        return;
    }

    try {
        // 1. Token Test
        console.log('\nSTEP 1: Testing /oauth/token...');
        const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            throw new Error(`Token failed: ${tokenRes.status} - ${err}`);
        }

        const tokenData = await tokenRes.json();
        console.log('✅ Token Success!');
        const token = tokenData.access_token;

        // 2. Search Test (Real API call)
        console.log('\nSTEP 2: Testing /v1/products/search (Real Naver API hit)...');
        const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-proxy-key': PROXY_KEY
            },
            body: JSON.stringify({ page: 0, size: 5 })
        });

        if (!searchRes.ok) {
            throw new Error(`Search failed: ${searchRes.status}`);
        }

        const searchData = await searchRes.json();
        console.log('✅ API Connection Verified!');
        console.log(`- Total Items: ${searchData.totalElements}`);
        console.log(`- First Item: ${searchData.contents?.[0]?.channelProducts?.[0]?.name}`);

        console.log('\n--- CROSS-VERIFICATION COMPLETE ---');
        console.log('Status: ACTIVE & FUNCTIONAL');
    } catch (e) {
        console.error('❌ Verification Failed:', e.message);
    }
}

runVerification();
