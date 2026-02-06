import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

try {
    console.log('Migrating database...');
    db.exec("ALTER TABLE products ADD COLUMN sold_at DATETIME;");
    console.log('Migration successful: Added sold_at column.');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('Column sold_at already exists.');
    } else {
        console.error('Migration failed:', error);
    }
} finally {
    db.close();
}
