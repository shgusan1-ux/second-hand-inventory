const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

async function checkLogs() {
    const url = process.env.TURSO_DATABASE_URL || 'file:inventory.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    const client = createClient({ url, authToken });

    try {
        console.log('--- Recent Audit Logs ---');
        const audit = await client.execute('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10');
        console.table(audit.rows);

        console.log('\n--- Recent Security Logs ---');
        const security = await client.execute('SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 10');
        console.table(security.rows);
    } catch (e) {
        console.error('Failed to query logs:', e.message);
    } finally {
        client.close();
    }
}

checkLogs();
