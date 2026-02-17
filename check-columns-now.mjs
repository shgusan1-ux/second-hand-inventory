import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const res = await client.execute("PRAGMA table_info(naver_product_map)");
    console.log(res.rows);
}
check();
