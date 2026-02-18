
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function checkBrands() {
    const client = createClient({ url: `file:${dbPath}` });
    try {
        const countRes = await client.execute("SELECT COUNT(*) as count FROM custom_brands");
        console.log(`Total brands: ${countRes.rows[0].count}`);

        const result = await client.execute("SELECT * FROM custom_brands ORDER BY id DESC LIMIT 20");
        console.log("Recent 20 brands:");
        console.table(result.rows.map(row => ({
            id: row.id,
            brand: row.brand_name,
            ko: row.brand_name_ko,
            tier: row.tier,
            created: row.created_at
        })));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkBrands();
