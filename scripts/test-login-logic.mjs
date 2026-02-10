import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
    url: 'file:inventory.db'
});

async function testLogin(username, password) {
    try {
        console.log(`Testing login for ${username}...`);
        const res = await client.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });

        if (res.rows.length === 0) {
            console.log('User not found');
            return;
        }

        const user = res.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        console.log(`Password match: ${match}`);
        console.log('User data:', { id: user.id, username: user.username, name: user.name });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

// From check-local-users.mjs: hmcompany123 (username)
testLogin('hmcompany123', 'p@ssword123'); // I don't know the password, but I can check if it exists
