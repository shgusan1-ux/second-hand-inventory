import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listTables() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', res.rows.map(r => r.name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}

listTables();
