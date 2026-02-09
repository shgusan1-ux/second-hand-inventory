import { db } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const client = await db.connect();
    const res = await client.query("SELECT * FROM products LIMIT 1");
    console.log('Columns:', Object.keys(res.rows[0]));
    console.log('Sample Data:', res.rows[0]);
    process.exit(0);
}
check();
