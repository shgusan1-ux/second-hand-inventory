
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function listTables() {
    const client = createClient({ url: `file:${dbPath}` });
    const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log(r.rows.map(row => row.name));

    // Check if categories or settings exist
    const settings = await client.execute("SELECT name FROM sqlite_master WHERE name = 'archive_category_settings'");
    console.log('archive_category_settings exists:', settings.rows.length > 0);
}

listTables();
