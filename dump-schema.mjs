import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function check() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        let output = '';
        for (const row of tables.rows) {
            output += `Table: ${row.name}\n`;
            const columns = await client.execute(`PRAGMA table_info(${row.name})`);
            output += columns.rows.map(c => `${c.name} (${c.type})`).join(', ') + '\n';
            output += '---\n';
        }
        fs.writeFileSync('schema_output.txt', output);
        console.log('Schema written to schema_output.txt');
    } catch (e) {
        console.error(e);
    }
}

check();
