import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('Creating naver_product_map table...');
        await client.execute(`
            CREATE TABLE IF NOT EXISTS naver_product_map (
                origin_product_no TEXT PRIMARY KEY,
                channel_product_no TEXT,
                naver_category_id TEXT,
                archive_category_id TEXT,
                name TEXT,
                sale_price INTEGER,
                stock_quantity INTEGER,
                status_type TEXT,
                seller_management_code TEXT,
                last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Creating indices...');
        await client.execute(`CREATE INDEX IF NOT EXISTS idx_naver_product_category ON naver_product_map(naver_category_id);`);
        await client.execute(`CREATE INDEX IF NOT EXISTS idx_naver_product_archive ON naver_product_map(archive_category_id);`);

        console.log('Creating naver_categories table...');
        await client.execute(`
            CREATE TABLE IF NOT EXISTS naver_categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                whole_category_name TEXT,
                is_last BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Migration successful');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.close();
    }
}

migrate();
