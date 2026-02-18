
import { createClient } from '@libsql/client';
import fs from 'fs';

const envProd = fs.readFileSync('.env.production', 'utf8');
const tursoUrl = envProd.match(/TURSO_DATABASE_URL="(.+?)\\n"/)?.[1] || "";
const tursoToken = envProd.match(/TURSO_AUTH_TOKEN="(.+?)\\n"/)?.[1] || "";

async function checkCommon() {
    const client = createClient({ url: tursoUrl, authToken: tursoToken });
    try {
        const check = ['UNIQLO', 'ADIDAS', 'POLO RALPH LAUREN', 'NIKE'];
        for (const name of check) {
            const res = await client.execute({
                sql: "SELECT * FROM custom_brands WHERE brand_name = ?",
                args: [name]
            });
            console.log(`${name}: ${res.rows.length > 0 ? 'Exits' : 'Missing'}`);
        }

        const count = await client.execute("SELECT COUNT(*) as cnt FROM custom_brands");
        console.log('Total custom brands:', count.rows[0].cnt);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkCommon();
