import { naverRequest } from '../src/lib/naver/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkStructure() {
    try {
        const res = await naverRequest('/v1/products/search', {
            method: 'POST',
            body: JSON.stringify({ page: 1, size: 1 })
        });
        fs.writeFileSync('product_structure.json', JSON.stringify(res.contents?.[0] || {}, null, 2));
    } catch (e: any) {
        fs.writeFileSync('product_structure_error.json', e.message);
    }
}

checkStructure();
