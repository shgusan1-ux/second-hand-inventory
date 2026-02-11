import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function pollForWork() {
    const url = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('--- RECENT ACTIVITY (Last 4 hours) ---');

        // Memos
        const memos = await client.execute("SELECT * FROM memos WHERE created_at > datetime('now', '-4 hours') ORDER BY created_at DESC");
        console.log(`Memos found: ${memos.rows.length}`);
        memos.rows.forEach(r => console.log(`[MEMO] ${r.author_name}: ${r.content}`));

        // Messages
        const msgs = await client.execute("SELECT * FROM messages WHERE created_at > datetime('now', '-4 hours') ORDER BY created_at DESC");
        console.log(`Messages found: ${msgs.rows.length}`);

        // Audit Logs
        const audits = await client.execute("SELECT * FROM audit_logs WHERE created_at > datetime('now', '-4 hours') ORDER BY created_at DESC LIMIT 10");
        console.log(`Recent Audits: ${audits.rows.length}`);
        audits.rows.forEach(r => console.log(`[AUDIT] ${r.action}: ${r.details}`));

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

pollForWork();
