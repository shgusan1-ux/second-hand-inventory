import { naverRequest } from '../src/lib/naver/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Inject missing if any for the script
process.env.NAVER_CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
process.env.NAVER_CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';
process.env.SMARTSTORE_PROXY_URL = 'http://15.164.216.212:8787';
process.env.SMARTSTORE_PROXY_KEY = 'brownstreet-proxy-key';

async function listCategories() {
    try {
        console.log('Fetching exhibition categories...');
        // Try to get exhibition categories
        // Usually: GET /v1/exhibition/categories
        const res = await naverRequest('/v1/exhibition/categories');
        console.log('Categories:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('Failed:', e.message);
    }
}

listCategories();
