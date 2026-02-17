
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function run() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const res = await client.execute("SELECT count(*) as count FROM naver_product_map");
        console.log('Count:', res.rows[0].count);
    } catch (e) {
        console.error(e);
    }
}

run();
