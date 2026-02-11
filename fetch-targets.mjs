import { db } from './src/lib/db.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fetchTargets() {
    try {
        console.log('Fetching targets...');
        const result = await db.query(`
            SELECT origin_product_no, name 
            FROM naver_product_map 
            WHERE (archive_category_id IS NULL OR archive_category_id = 'UNCATEGORIZED') 
            AND (is_approved = 0 OR is_approved IS NULL)
            LIMIT 100
        `);
        console.log(`Found ${result.rows.length} targets.`);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

fetchTargets();
