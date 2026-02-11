import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkColumns() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        const res = await client.execute("PRAGMA table_info(naver_product_map)");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}

checkColumns();
