import { createClient } from '@libsql/client';

const client = createClient({
    url: 'file:inventory.db'
});

async function check() {
    try {
        const res = await client.execute('SELECT id, username, name, role FROM users');
        console.log('Users in inventory.db:');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error('Error checking users:', e.message);
    }
}

check();
