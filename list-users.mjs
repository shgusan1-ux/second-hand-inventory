import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:inventory.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function listUsers() {
    try {
        console.log('Fetching all users from database...\n');

        const result = await client.execute('SELECT id, username, name, role, job_title, created_at FROM users ORDER BY created_at DESC');

        if (result.rows.length === 0) {
            console.log('❌ No users found in database!');
        } else {
            console.log(`✅ Found ${result.rows.length} users:\n`);
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. ${user.username} (${user.name})`);
                console.log(`   - ID: ${user.id}`);
                console.log(`   - Role: ${user.role}`);
                console.log(`   - Job Title: ${user.job_title}`);
                console.log(`   - Created: ${user.created_at}`);
                console.log('');
            });
        }
    } catch (error) {
        console.error('❌ Error fetching users:', error);
    } finally {
        client.close();
    }
}

listUsers();
