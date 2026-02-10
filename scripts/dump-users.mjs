import { createClient } from '@libsql/client';

const client = createClient({
    url: 'file:inventory.db'
});

async function check() {
    try {
        const res = await client.execute('SELECT * FROM users');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}

check();
