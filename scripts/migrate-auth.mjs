import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Migrating database for Auth & Logs...');

const queries = [
    `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`
];

queries.forEach(query => {
    try {
        db.exec(query);
    } catch (err) {
        console.error('Migration failed:', err.message);
    }
});

// Create default admin user if not exists (password: admin123)
// In a real app, use bcrypt. Here we validly simulate it.
// We will implement register function later properly.
// For now, let's keep it clean and rely on registration page or initial seed later.

console.log('Auth & Logs Schema created.');
db.close();
