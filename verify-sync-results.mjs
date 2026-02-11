import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifySync() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('--- SYNC VERIFICATION ---');

        const countRes = await client.execute('SELECT COUNT(*) as count FROM naver_product_map');
        console.log(`Total items synced: ${countRes.rows[0].count}`);

        const archiveStats = await client.execute(`
            SELECT archive_category_id, COUNT(*) as count 
            FROM naver_product_map 
            WHERE archive_category_id IS NOT NULL 
            GROUP BY archive_category_id
        `);
        console.log('\nArchive Category Distribution (Actual in DB):');
        console.table(archiveStats.rows);

        const sample = await client.execute(`
            SELECT origin_product_no, name, archive_category_id 
            FROM naver_product_map 
            WHERE archive_category_id IS NOT NULL 
            LIMIT 5
        `);
        console.log('\nSample Categorized Items:');
        console.table(sample.rows);

    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}

verifySync();
