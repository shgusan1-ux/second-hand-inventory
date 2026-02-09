import { db } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    try {
        const client = await db.connect();
        const res = await client.query("SELECT * FROM products LIMIT 1");
        console.log(JSON.stringify({
            columns: Object.keys(res.rows[0]),
            sample: res.rows[0]
        }, null, 2));
    } catch (e: any) {
        console.error(e.message);
    }
    process.exit(0);
}
check();
