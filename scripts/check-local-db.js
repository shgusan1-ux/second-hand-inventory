const Database = require('better-sqlite3');
const db = new Database('inventory.db');

try {
    const users = db.prepare('SELECT id, username, name FROM users').all();
    console.log('--- Local Users ---');
    console.log(users);
} catch (e) {
    console.error('Error reading local users:', e.message);
}

try {
    const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log('--- Local Products Count ---');
    console.log(productsCount);
} catch (e) {
    console.error('Error reading local products:', e.message);
}

db.close();
