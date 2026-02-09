import { naverRequest } from '../src/lib/naver/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

process.env.NAVER_CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
process.env.NAVER_CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';
process.env.SMARTSTORE_PROXY_URL = 'http://15.164.216.212:8787';
process.env.SMARTSTORE_PROXY_KEY = 'brownstreet-proxy-key';

async function testEndpoints() {
    const endpoints = [
        '/v1/exhibition/categories',
        '/v1/seller-categories',
        '/v1/categories/seller',
        '/v1/store/categories',
        '/v1/exhibition/store-categories'
    ];

    for (const ep of endpoints) {
        try {
            console.log(`Testing ${ep}...`);
            const res = await naverRequest(ep);
            console.log(`Success on ${ep}:`, JSON.stringify(res, null, 2).substring(0, 1000));
        } catch (e: any) {
            console.log(`Failed on ${ep}: ${e.message}`);
        }
    }
}

testEndpoints();
