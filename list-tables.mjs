
import { createClient } from '@libsql/client';

async function run() {
    const client = createClient({ url: 'file:inventory.db' });
    const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(res.rows.map(r => r.name));
}

run();
