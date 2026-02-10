import { createClient } from '@libsql/client';

const client = createClient({
    url: 'file:inventory.db'
});

async function check() {
    const res = await client.execute('SELECT id, username FROM users');
    for (const row of res.rows) {
        console.log(`ID: ${row.id}`);
        console.log(`Username: "${row.username}" (Length: ${row.username.length})`);
        console.log(`Chars: ${[...row.username].map(c => c.charCodeAt(0)).join(',')}`);
    }
}

check();
