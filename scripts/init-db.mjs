import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Initializing database at:', dbPath);

const schema = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    price_consumer INTEGER,
    price_sell INTEGER,
    status TEXT DEFAULT '판매중',
    condition TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sold_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0
  );
  
  -- Insert default categories if empty
  INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES 
  ('TOP', '상의', 1),
  ('BOTTOM', '하의', 2),
  ('OUTER', '아우터', 3),
  ('ACC', '잡화', 4);
`;

try {
  db.exec(schema);
  console.log('Database initialized successfully.');
} catch (error) {
  console.error('Error initializing database:', error);
} finally {
  db.close();
}
