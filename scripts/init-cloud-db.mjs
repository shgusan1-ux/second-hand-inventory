import { db } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Connecting to Vercel Postgres...');

    const client = await db.connect();

    try {
        console.log('Creating "products" table...');
        await client.sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        size TEXT,  -- Ensure 'size' column exists
        price_consumer INTEGER,
        price_sell INTEGER,
        status TEXT DEFAULT '판매중',
        condition TEXT,
        image_url TEXT,
        type TEXT DEFAULT '일반',
        description TEXT,
        location TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        sold_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `;

        console.log('Creating "categories" table...');
        await client.sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0
      );
    `;

        console.log('Seeding default categories...');
        await client.sql`
      INSERT INTO categories (id, name, sort_order) 
      VALUES 
        ('TOP', '상의', 1),
        ('BOTTOM', '하의', 2),
        ('OUTER', '아우터', 3),
        ('ACC', '잡화', 4)
      ON CONFLICT (id) DO NOTHING;
    `;

        // Add size column if it doesn't exist (Migration)
        console.log('Migrating: checking for size column...');
        try {
            await client.sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS size TEXT;`;
        } catch (e) {
            console.log('Size column check/add ignored:', e.message);
        }

        // Add type column if it exists (Migration)
        console.log('Migrating: checking for type column...');
        try {
            await client.sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT '일반';`;
        } catch (e) {
            console.log('Type column check/add ignored:', e.message);
        }

        console.log('Migrating: checking for location column...');
        try {
            await client.sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS location TEXT;`;
        } catch (e) {
            console.log('Location column check/add ignored:', e.message);
        }

        console.log('Migrating: checking for description column...');
        try {
            await client.sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;`;
        } catch (e) {
            console.log('Description column check/add ignored:', e.message);
        }

        console.log('Migrating: checking for deleted_at column...');
        try {
            await client.sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;`;
        } catch (e) {
            console.log('deleted_at column check/add ignored:', e.message);
        }

        console.log('✅ Cloud Database setup completed successfully!');
    } catch (error) {
        console.error('❌ Error initializing cloud database:', error);
    } finally {
        // client.release() is handled by the pool, but explicit close isn't strictly needed for script 
        // simply exiting process 
        process.exit(0);
    }
}

main();
