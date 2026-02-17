
const { createClient } = require('@libsql/client');

async function test() {
    const categoryId = 'bedf1e439281477fb6383cfb1770eea9';
    const client = createClient({ url: 'file:inventory.db' });

    try {
        console.log('--- Database Check for Category ---');
        const catRes = await client.execute({
            sql: 'SELECT * FROM naver_categories WHERE id = ?',
            args: [categoryId]
        });
        if (catRes.rows.length > 0) {
            console.log('Category found:', catRes.rows[0]);
        } else {
            console.log('Category not found in naver_categories table.');
        }

        console.log('\n--- Checking assigned products (naver_product_map) ---');
        // Let's check for any mention of this ID in JSON/Text columns
        const prodRes = await client.execute({
            sql: 'SELECT origin_product_no, name, naver_display_category, display_category_ids FROM naver_product_map WHERE naver_display_category LIKE ? OR display_category_ids LIKE ? LIMIT 10',
            args: [`%${categoryId}%`, `%${categoryId}%`]
        });
        console.log(`Found ${prodRes.rows.length} products linked to this category in DB.`);
        prodRes.rows.forEach(r => console.log(` - ${r.origin_product_no}: ${r.name}`));

        console.log('\n--- Checking exhibition sync logs ---');
        const logRes = await client.execute({
            sql: 'SELECT product_no, status, error_message, created_at FROM exhibition_sync_logs WHERE target_category = ? OR error_message LIKE ? ORDER BY created_at DESC LIMIT 5',
            args: [categoryId, `%${categoryId}%`]
        });
        if (logRes.rows.length > 0) {
            console.log('Recent sync logs for this category:');
            logRes.rows.forEach(l => console.log(` - ${l.product_no} | ${l.status} | ${l.error_message || 'OK'} | ${l.created_at}`));
        } else {
            console.log('No sync logs found for this category.');
        }

    } catch (e) {
        console.error('Test Error:', e);
    }
}

test();
