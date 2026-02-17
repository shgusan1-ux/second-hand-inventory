
const { createClient } = require('@libsql/client');

async function list() {
    const client = createClient({ url: 'file:inventory.db' });
    try {
        const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:');
        r.rows.forEach(tbl => console.log(' - ' + tbl.name));
    } catch (e) {
        console.error(e);
    }
}
list();
