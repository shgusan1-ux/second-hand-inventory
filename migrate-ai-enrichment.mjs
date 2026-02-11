import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('Adding AI enrichment columns...');

        const alterStatements = [
            `ALTER TABLE naver_product_map ADD COLUMN inferred_brand TEXT`,
            `ALTER TABLE naver_product_map ADD COLUMN ocr_text TEXT`,
            `ALTER TABLE naver_product_map ADD COLUMN product_description TEXT`
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
