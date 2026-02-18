
import { createClient } from '@libsql/client';
import fs from 'fs';

const envProd = fs.readFileSync('.env.production', 'utf8');
const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";

async function checkBrands() {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    try {
        const result = await client.execute("SELECT * FROM custom_brands ORDER BY id DESC LIMIT 10");
        console.log("Recent 10 brands in Turso:");
        result.rows.forEach(row => {
            console.log(`[${row.created_at}] ${row.brand_name} (${row.brand_name_ko}) - ${row.tier}`);
        });
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkBrands();
