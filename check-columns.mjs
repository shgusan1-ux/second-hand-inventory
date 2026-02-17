
import { createClient } from '@libsql/client';

async function run() {
    const client = createClient({ url: 'file:inventory.db' });
    const res = await client.execute("PRAGMA table_info(naver_product_map)");
    console.log(JSON.stringify(res.rows.map(r => r.name)));
}

run();
