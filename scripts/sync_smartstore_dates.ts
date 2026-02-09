import { naverRequest } from '../src/lib/naver/client';
import { db } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function syncDates() {
    console.log('--- Syncing SmartStore Reg Dates to products.master_reg_date ---');
    try {
        const res = await naverRequest('/v1/products/search', {
            method: 'POST',
            body: JSON.stringify({ page: 1, size: 1000 })
        });
        if (!res?.contents) {
            console.log('No products from Naver.');
            return;
        }

        const client = await db.connect();
        let updatedCount = 0;
        for (const item of res.contents) {
            const cp = item.channelProducts?.[0];
            if (cp?.sellerManagementCode && cp.regDate) {
                // In our DB, 'id' is used for the seller management code
                const result = await client.query(
                    `UPDATE products SET master_reg_date = $1 WHERE id = $2`,
                    [cp.regDate, cp.sellerManagementCode]
                );
                if (result.rowCount > 0) {
                    updatedCount++;
                }
            }
        }
        console.log(`Successfully updated ${updatedCount} products.`);
    } catch (e: any) {
        console.error('Sync failed:', e.message);
    }
    process.exit(0);
}
syncDates();
