import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

try {
    const addSize = db.prepare('ALTER TABLE products ADD COLUMN size TEXT');
    addSize.run();
    console.log('Added size column.');

    // Set default value if needed, though NULL is fine
    // db.prepare("UPDATE products SET size = '' WHERE size IS NULL").run();

} catch (e) {
    if (!e.message.includes('duplicate column')) {
        console.error('Failed to add size:', e.message);
    } else {
        console.log('size column already exists.');
    }
}
