
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function run() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const res = await client.execute("SELECT count(*) as count FROM exhibition_sync_logs");
        console.log('Sync Logs Count:', res.rows[0].count);
    } catch (e) {
        console.error('Error (table might not exist yet):', e.message);
    }
}

run();
