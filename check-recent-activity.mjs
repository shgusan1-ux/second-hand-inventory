
import { createClient } from '@libsql/client';
import fs from 'fs';

const envProd = fs.readFileSync('.env.production', 'utf8');
const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";

async function checkBrands() {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    try {
        const result = await client.execute("SELECT COUNT(*) as count FROM custom_brands WHERE created_at > '2026-02-12'");
        console.log(`Brands added after 2026-02-12: ${result.rows[0].count}`);

        const latest = await client.execute("SELECT * FROM custom_brands ORDER BY id DESC LIMIT 5");
        console.log("Latest 5 records:");
        latest.rows.forEach(r => console.log(r.id, r.brand_name, r.created_at));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkBrands();
