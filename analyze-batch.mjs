import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function analyze() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('Fetching products lacking archive category...');
        const res = await client.execute(`
            SELECT origin_product_no, name 
            FROM naver_product_map 
            WHERE (archive_category_id IS NULL OR archive_category_id = 'UNCATEGORIZED') 
            AND (is_approved = 0 OR is_approved IS NULL)
            LIMIT 100
        `);

        const products = res.rows;
        console.log(`Found ${products.length} products to analyze.`);

        if (products.length === 0) {
            console.log('No products to analyze.');
            return;
        }

        fs.writeFileSync('unclassified_batch.json', JSON.stringify(products, null, 2));
        console.log('Saved 100 products to unclassified_batch.json');

    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}

analyze();
