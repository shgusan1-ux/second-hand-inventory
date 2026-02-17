
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function run() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const res = await client.execute("SELECT * FROM naver_product_map LIMIT 1");
        console.log(res.rows[0]);
    } catch (e) {
        console.error(e);
    }
}

run();
