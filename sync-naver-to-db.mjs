import { createClient } from '@libsql/client';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { calculateLifecycle } from './src/lib/classification/lifecycle.ts';
import { classifyArchive } from './src/lib/classification/archive.ts';

dotenv.config({ path: '.env.local' });

const PROXY_URL = process.env.SMARTSTORE_PROXY_URL || 'http://15.164.216.212:3001';
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function syncProductsBatch() {
    console.log('--- Naver to DB Sync & Categorization Start ---');

    if (!CLIENT_ID || !CLIENT_SECRET || !TURSO_URL) {
        console.error('Missing configuration in .env.local');
        return;
    }

    const dbClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    try {
        // 1. Get Token
        const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });
        const { access_token } = await tokenRes.json();
        if (!access_token) throw new Error('Failed to get token');

        // 2. Fetch all products and Sync to DB
        let totalProcessed = 0;
        let totalPages = 11; // Based on 1017 items / 100

        for (let page = 0; page < totalPages; page++) {
            console.log(`\n[Batch ${page}] Fetching products...`);
            const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ page, size: 100 })
            });
            const data = await searchRes.json();
            const products = data.contents || [];

            if (products.length === 0) break;

            console.log(`[Batch ${page}] Validating and saving ${products.length} products...`);

            for (const p of products) {
                const cp = p.channelProducts?.[0];
                if (!cp) continue;

                const prodId = p.originProductNo.toString();
                const prodName = cp.name;
                const regDate = cp.regDate;

                // Classification
                const lifecycle = calculateLifecycle(regDate, null);
                const archive = classifyArchive(prodName, []);

                // Save archive category for all items to enable category-based view
                const archiveCategoryId = archive.category !== 'UNCATEGORIZED' ? archive.category : null;

                // Sync to naver_product_map
                await dbClient.execute({
                    sql: `INSERT INTO naver_product_map (
                        origin_product_no, channel_product_no, naver_category_id, 
                        archive_category_id, name, sale_price, stock_quantity, 
                        status_type, seller_management_code, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(origin_product_no) DO UPDATE SET
                        channel_product_no = excluded.channel_product_no,
                        archive_category_id = excluded.archive_category_id,
                        name = excluded.name,
                        sale_price = excluded.sale_price,
                        stock_quantity = excluded.stock_quantity,
                        status_type = excluded.status_type,
                        last_synced_at = CURRENT_TIMESTAMP`,
                    args: [
                        prodId,
                        cp.channelProductNo?.toString(),
                        cp.categoryId,
                        archiveCategoryId,
                        prodName,
                        cp.salePrice,
                        cp.stockQuantity,
                        cp.statusType,
                        cp.sellerManagementCode
                    ]
                });
            }
            totalProcessed += products.length;
            console.log(`[Batch ${page}] Successfully synced ${products.length} items. Total: ${totalProcessed}`);
        }

        console.log('\n--- Sync Complete ---');
        console.log(`Total items in Database: ${totalProcessed}`);

    } catch (e) {
        console.error('Sync Error:', e.message);
    } finally {
        dbClient.close();
    }
}

syncProductsBatch();
