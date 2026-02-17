
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function run() {
    const client = createClient({ url: `file:${dbPath}` });
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    tables.rows.forEach(r => console.log(`- ${r.name}`));
}

run();
