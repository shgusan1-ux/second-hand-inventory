import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('Adding AI suggestion columns to naver_product_map...');

        const alterStatements = [
            `ALTER TABLE naver_product_map ADD COLUMN suggested_archive_id TEXT`,
            `ALTER TABLE naver_product_map ADD COLUMN suggestion_reason TEXT`,
            `ALTER TABLE naver_product_map ADD COLUMN is_approved BOOLEAN DEFAULT FALSE`
        ];

        for (const sql of alterStatements) {
            try {
                await client.execute(sql);
                console.log(`[OK] ${sql}`);
            } catch (e) {
                console.warn(`[SKIP/FAIL] ${sql}: ${e.message}`);
            }
        }

        console.log('✅ Migration complete');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        client.close();
    }
}

migrate();
