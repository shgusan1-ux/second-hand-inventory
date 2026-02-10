import { createClient } from '@libsql/client';
import fs from 'fs';

const client = createClient({
    url: 'file:inventory.db'
});

async function check() {
    try {
        const res = await client.execute('SELECT * FROM users');
        fs.writeFileSync('users_dump.json', JSON.stringify(res.rows, null, 2));
        console.log('Saved to users_dump.json');
    } catch (e) {
        console.error(e);
    }
}

check();
