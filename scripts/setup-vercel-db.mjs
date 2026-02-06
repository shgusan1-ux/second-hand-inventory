
import { sql } from '@vercel/postgres';


async function main() {
    console.log('Starting Vercel Postgres setup...');

    try {
        // 1. Products Table
        console.log('Creating products table...');
        await sql`
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
        images TEXT,
        md_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sold_at TIMESTAMP,
        size TEXT
      );
    `;

        // 2. Categories Table
        console.log('Creating categories table...');
        await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0
      );
    `;

        // Insert Default Categories
        console.log('Seeding categories...');
        await sql`
      INSERT INTO categories (id, name, sort_order) VALUES 
      ('TOP', '상의', 1),
      ('BOTTOM', '하의', 2),
      ('OUTER', '아우터', 3),
      ('ACC', '잡화', 4)
      ON CONFLICT (id) DO NOTHING; 
    `;

        // 3. Users Table
        console.log('Creating users table...');
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        job_title TEXT,
        password_hint TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

        // Note: I saw job_title usage in 'src/app/settings/users/page.tsx' but it wasn't in 'migrate-auth.mjs'.
        // Checking 'src/lib/auth.ts' might be wise, but adding job_title is safer if it's used.
        // Wait, let's verify if job_title is in the code. I saw: session.job_title.
        // And I saw "migrate-user-fields.mjs" previously in the file list. Let's check that too before finalizing.

        // 4. Audit Logs Table
        console.log('Creating audit_logs table...');
        await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        -- FOREIGN KEY(user_id) REFERENCES users(id) -- Optional enforcement
      );
    `;

        console.log('✅ Setup completed successfully.');
    } catch (err) {
        console.error('❌ Setup failed:', err);
        process.exit(1);
    }
}

main();
