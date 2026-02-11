import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function finalApprove() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('--- Final Approval Process Start ---');

        // 1. Fetch pending items
        const pending = await client.execute(`
            SELECT origin_product_no, suggested_archive_id 
            FROM naver_product_map 
            WHERE suggested_archive_id IS NOT NULL 
            AND (is_approved = 0 OR is_approved IS NULL)
        `);

        if (pending.rows.length === 0) {
            console.log('No pending suggestions found.');
            return;
        }

        console.log(`Approving ${pending.rows.length} items...`);

        for (const item of pending.rows) {
            const id = item.origin_product_no;
            const cat = item.suggested_archive_id;

            // Update naver_product_map
            await client.execute({
                sql: `UPDATE naver_product_map 
                      SET archive_category_id = ?, is_approved = 1 
                      WHERE origin_product_no = ?`,
                args: [cat, id]
            });

            // Sync to product_overrides
            await client.execute({
                sql: `INSERT INTO product_overrides (id, internal_category) 
                      VALUES (?, ?)
                      ON CONFLICT(id) DO UPDATE SET 
                        internal_category = excluded.internal_category,
                        updated_at = CURRENT_TIMESTAMP`,
                args: [id, cat]
            });
        }

        console.log('✅ Final approval complete for all items.');

        // 2. Final Verification
        const stats = await client.execute(`
            SELECT archive_category_id, COUNT(*) as count 
            FROM naver_product_map 
            WHERE archive_category_id IS NOT NULL 
            GROUP BY archive_category_id
        `);
        console.log('\nUpdated Archive Category Distribution:');
        console.table(stats.rows);

    } catch (e) {
        console.error('Approval failed:', e);
    } finally {
        client.close();
    }
}

finalApprove();
