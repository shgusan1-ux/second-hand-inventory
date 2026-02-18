
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

// Read .env.production manually because dotenv might struggle with the path or format
const envProd = fs.readFileSync('.env.production', 'utf8');
const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";

console.log('Connecting to Turso:', tursoUrl);

async function checkBrands() {
    if (!tursoUrl || !tursoToken) {
        console.error('Missing Turso credentials in .env.production');
        // Fallback to local if not found (though match might fail due to escaping)
        return;
    }

    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    try {
        const countRes = await client.execute("SELECT COUNT(*) as count FROM custom_brands");
        console.log(`Total brands in Turso: ${countRes.rows[0].count}`);

        const result = await client.execute("SELECT * FROM custom_brands ORDER BY id DESC LIMIT 10");
        console.log("Latest 10 brands in Turso:");
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
