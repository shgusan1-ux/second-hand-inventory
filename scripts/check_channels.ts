import { naverRequest } from '../src/lib/naver/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkChannels() {
    try {
        const res = await naverRequest('/v1/seller/channels');
        fs.writeFileSync('seller_channels.json', JSON.stringify(res, null, 2));
    } catch (e: any) {
        fs.writeFileSync('seller_channels_error.json', e.message);
    }
}

checkChannels();
