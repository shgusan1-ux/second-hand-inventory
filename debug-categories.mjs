import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function check() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        console.log('--- Top 10 Categories in product_overrides ---');
        const result = await client.execute(`
            SELECT internal_category, COUNT(*) as cnt
            FROM product_overrides
            GROUP BY internal_category
            ORDER BY cnt DESC
            LIMIT 10
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        console.log('\n--- Status counts in naver_product_map ---');
        const statusResult = await client.execute(`
            SELECT status, COUNT(*) as cnt
            FROM naver_product_map
            GROUP BY status
        `);
        console.log(JSON.stringify(statusResult.rows, null, 2));

        console.log('\n--- Count of products in naver_product_map but NOT in product_overrides ---');
        const missing = await client.execute(`
            SELECT COUNT(*) as cnt
            FROM naver_product_map n
            LEFT JOIN product_overrides p ON n.id = p.id
            WHERE p.id IS NULL
        `);
        console.log('Missing in overrides:', missing.rows[0].cnt);

        // Check for "UNCATEGORIZED" or similar
        const uncategorized = await client.execute(`
            SELECT COUNT(*) as cnt FROM product_overrides WHERE internal_category = 'UNCATEGORIZED'
        `);
        console.log('UNCATEGORIZED count:', uncategorized.rows[0].cnt);

    } catch (e) {
        console.error(e);
    }
}

check();
