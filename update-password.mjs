import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:inventory.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const username = '01033081114';
const password = 'zmffldkd1*';

async function updatePassword() {
    try {
        console.log('Hashing password...');
        const password_hash = await bcrypt.hash(password, 10);

        console.log('Updating password...');
        const result = await client.execute({
            sql: `UPDATE users SET password_hash = ? WHERE username = ?`,
            args: [password_hash, username]
        });

        console.log('✅ Password updated successfully!');
        console.log(`   Username: ${username}`);
        console.log(`   New Password: ${password}`);
        console.log(`   Rows affected: ${result.rowsAffected}`);

        // Also update role to admin
        await client.execute({
            sql: `UPDATE users SET role = 'admin', job_title = '대표자' WHERE username = ?`,
            args: [username]
        });

        console.log('✅ Role updated to admin!');

    } catch (error) {
        console.error('❌ Error updating password:', error);
    } finally {
        client.close();
    }
}

updatePassword();
