import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Migrating database for Extended User Fields...');

try {
    const addHint = db.prepare('ALTER TABLE users ADD COLUMN password_hint TEXT');
    addHint.run();
    console.log('Added password_hint column.');
} catch (e) {
    if (!e.message.includes('duplicate column')) {
        console.error('Failed to add password_hint:', e.message);
    } else {
        console.log('password_hint column already exists.');
    }
}

try {
    const addJobTitle = db.prepare('ALTER TABLE users ADD COLUMN job_title TEXT');
    addJobTitle.run();
    console.log('Added job_title column.');
} catch (e) {
    if (!e.message.includes('duplicate column')) {
        console.error('Failed to add job_title:', e.message);
    } else {
        console.log('job_title column already exists.');
    }
}

console.log('Extended User Fields migration completed.');
db.close();
