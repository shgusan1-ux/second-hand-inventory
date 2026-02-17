import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function check() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const totalProducts = await client.execute("SELECT COUNT(*) as cnt FROM naver_products WHERE status_type IN ('SALE', 'OUTOFSTOCK', 'SUSPENSION')");
        console.log('Total Active Products:', totalProducts.rows[0].cnt);

        const internalCategories = await client.execute(`
            SELECT p.internal_category, COUNT(*) as cnt
            FROM naver_products n
            LEFT JOIN product_overrides p ON n.origin_product_no = p.id
            WHERE n.status_type IN ('SALE', 'OUTOFSTOCK', 'SUSPENSION')
            GROUP BY p.internal_category
        `);
        console.log('Category Counts:');
        for (const row of internalCategories.rows) {
            console.log(`${row.internal_category || 'NULL'}: ${row.cnt}`);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
