
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

async function migrate() {
    const client = createClient({ url: `file:${dbPath}` });
    const mapping = {
        'MILITARY': 'MILITARY ARCHIVE',
        'WORKWEAR': 'WORKWEAR ARCHIVE',
        'OUTDOOR': 'OUTDOOR ARCHIVE',
        'JAPAN': 'JAPANESE ARCHIVE',
        'EUROPE': 'HERITAGE EUROPE',
        'BRITISH': 'BRITISH ARCHIVE',
        'UNISEX': 'UNISEX ARCHIVE'
    };

    console.log('Starting migration of archive categories...');

    for (const [short, long] of Object.entries(mapping)) {
        try {
            const res = await client.execute({
                sql: 'UPDATE product_overrides SET internal_category = ? WHERE internal_category = ?',
                args: [long, short]
            });
            console.log(`Updated ${short} -> ${long}: ${res.rowsAffected} rows affected`);
        } catch (err) {
            console.error(`Error updating ${short}:`, err);
        }
    }

    // Also check current counts
    const counts = await client.execute("SELECT internal_category, COUNT(*) as cnt FROM product_overrides GROUP BY internal_category");
    console.log('\nCurrent Category Counts:');
    console.log(JSON.stringify(counts.rows, null, 2));
}

migrate();
