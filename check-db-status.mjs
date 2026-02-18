
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function checkDb() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("Tables in DB:", tables.rows.map(r => r.name).join(', '));

        for (const table of tables.rows) {
            const name = table.name;
            const countRes = await client.execute(`SELECT COUNT(*) as count FROM "${name}"`);
            console.log(`${name}: ${countRes.rows[0].count} rows`);
        }

        console.log("\nLatest 5 Brands (if any):");
        const brands = await client.execute("SELECT * FROM custom_brands ORDER BY id DESC LIMIT 5");
        console.table(brands.rows);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkDb();
