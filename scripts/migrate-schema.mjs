import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Migrating database at:', dbPath);

const migrations = [
    {
        table: 'products',
        column: 'md_comment',
        type: 'TEXT',
        query: 'ALTER TABLE products ADD COLUMN md_comment TEXT'
    },
    {
        table: 'products',
        column: 'images',
        type: 'TEXT',
        query: 'ALTER TABLE products ADD COLUMN images TEXT'
    },
    {
        table: 'categories',
        column: 'sort_order',
        type: 'INTEGER DEFAULT 0',
        query: 'ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0'
    }
];

migrations.forEach(m => {
    try {
        const tableInfo = db.pragma(`table_info(${m.table})`);
        const columnExists = tableInfo.some(col => col.name === m.column);

        if (!columnExists) {
            console.log(`Adding ${m.column} to ${m.table}...`);
            db.exec(m.query);
            console.log(`Added ${m.column} to ${m.table}`);
        } else {
            console.log(`${m.column} already exists in ${m.table}`);
        }
    } catch (err) {
        console.error(`Failed to add ${m.column} to ${m.table}:`, err.message);
    }
});

console.log('Migration complete.');
db.close();
