import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function check() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const result = await client.execute('SELECT ifnull(internal_category, "NULL") as cat, COUNT(*) as cnt FROM product_overrides GROUP BY internal_category');
        for (const row of result.rows) {
            console.log(`${row.cat}: ${row.cnt}`);
        }

        const total = await client.execute('SELECT COUNT(*) as cnt FROM product_overrides');
        console.log(`Total rows in product_overrides: ${total.rows[0].cnt}`);

        const top10 = await client.execute('SELECT internal_category, COUNT(*) as cnt FROM product_overrides GROUP BY internal_category ORDER BY cnt DESC LIMIT 20');
        console.log('Top 20 categories:');
        for (const row of top10.rows) {
            console.log(`${row.internal_category}: ${row.cnt}`);
        }

    } catch (e) {
        console.error(e);
    }
}

check();
