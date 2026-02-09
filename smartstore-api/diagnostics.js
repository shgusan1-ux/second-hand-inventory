const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const PROXY_URL = 'http://15.164.216.212:8787';
const PROXY_KEY = 'brownstreet-proxy-key';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

async function runDiagnostics() {
    console.log("=== NAVER SMARTSTORE API DIAGNOSTICS ===\n");

    let accessToken = null;

    // 1. Health Check
    console.log("[STEP 1] Proxy Health Check");
    try {
        const url = `${PROXY_URL}/health`;
        const res = await axios.get(url, { headers: { 'x-proxy-key': PROXY_KEY } });
        console.log(`URL: ${url}`);
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${JSON.stringify(res.data)}\n`);
    } catch (e) {
        console.error(`Status: ${e.response?.status || 'ERR'}`);
        console.error(`Error: ${JSON.stringify(e.response?.data || e.message)}\n`);
        return;
    }

    // 2. Token Test
    console.log("[STEP 2] Naver Token Issuance via Proxy");
    try {
        const url = `${PROXY_URL}/naver/token`;
        const bcrypt = require('bcryptjs');
        const timestamp = Date.now().toString();
        const signature = bcrypt.hashSync(`${CLIENT_ID}_${timestamp}`, CLIENT_SECRET);
        const encodedSignature = Buffer.from(signature).toString('base64');

        const payload = {
            client_id: CLIENT_ID,
            timestamp: timestamp,
            client_secret_sign: encodedSignature,
            grant_type: 'client_credentials',
            type: 'SELF'
        };

        const res = await axios.post(url, payload, {
            headers: {
                'x-proxy-key': PROXY_KEY,
                'Content-Type': 'application/json'
            }
        });

        accessToken = res.data.access_token;
        console.log(`URL: ${url}`);
        console.log(`Status: ${res.status}`);
        console.log(`Body: Token acquired (Ends with ...${accessToken.slice(-10)})\n`);
    } catch (e) {
        console.error(`Status: ${e.response?.status || 'ERR'}`);
        console.error(`Error: ${JSON.stringify(e.response?.data || e.message)}\n`);
        // Continue to step 3 might fail but let's try if token exists or stop
        if (!accessToken) return;
    }

    // 3. Product Search Test
    console.log("[STEP 3] Product Search via Proxy");
    try {
        const url = `${PROXY_URL}/v1/products/search`;
        const res = await axios.post(url,
            { page: 1, size: 1 },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'x-proxy-key': PROXY_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`URL: ${url}`);
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${JSON.stringify(res.data).substring(0, 500)}...\n`);
    } catch (e) {
        console.error(`Status: ${e.response?.status || 'ERR'}`);
        console.error(`Error: ${JSON.stringify(e.response?.data || e.message)}\n`);
    }
}

runDiagnostics();
