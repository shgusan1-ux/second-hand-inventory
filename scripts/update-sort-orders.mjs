import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

const updates = [
    { id: 'TOP', sort_order: 1 },
    { id: 'BOTTOM', sort_order: 2 },
    { id: 'OUTER', sort_order: 3 },
    { id: 'ACC', sort_order: 4 }
];

const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');

updates.forEach(u => {
    const result = stmt.run(u.sort_order, u.id);
    console.log(`Updated ${u.id}: ${result.changes} changes`);
});

console.log('Sort orders updated.');
