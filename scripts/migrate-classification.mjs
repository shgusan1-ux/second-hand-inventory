import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Migrating database for Category Classification...');

try {
    const addClass = db.prepare('ALTER TABLE categories ADD COLUMN classification TEXT');
    addClass.run();
    console.log('Added classification column.');

    // Optional: Set default based on sort_order if needed, but easier to leave empty or default '기타'
    // Let's set a default empty string or generic
    db.prepare("UPDATE categories SET classification = '' WHERE classification IS NULL").run();

} catch (e) {
    if (!e.message.includes('duplicate column')) {
        console.error('Failed to add classification:', e.message);
    } else {
        console.log('classification column already exists.');
    }
}

console.log('Category Classification migration completed.');
db.close();
