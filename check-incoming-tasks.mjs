import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkTasks() {
    const url = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        const memos = await client.execute('SELECT * FROM memos ORDER BY created_at DESC LIMIT 5');
        console.log('--- MEMOS ---');
        memos.rows.forEach(r => console.log(`[${r.created_at}] ${r.author_name}: ${r.content}`));

        const tasks = await client.execute('SELECT * FROM dashboard_tasks WHERE is_completed = 0 ORDER BY created_at DESC');
        console.log('\n--- PENDING TASKS ---');
        tasks.rows.forEach(r => console.log(`[${r.created_at}] ID: ${r.id} - ${r.content}`));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.close();
    }
}

checkTasks();
