
const { createClient } = require('@libsql/client');

async function check() {
    const categoryId = 'bedf1e439281477fb6383cfb1770eea9';
    const client = createClient({ url: 'file:inventory.db' });

    try {
        console.log('Checking category in local inventory.db:', categoryId);

        // 1. Check in naver_categories
        const catRes = await client.execute({
            sql: 'SELECT * FROM naver_categories WHERE id = ?',
            args: [categoryId]
        });
        console.log('Category details:', catRes.rows);

        // 2. Count products matching this category in naver_product_map
        const prodCountRes = await client.execute({
            sql: 'SELECT count(*) as count FROM naver_product_map WHERE naver_display_category LIKE ? OR display_category_ids LIKE ?',
            args: [`%${categoryId}%`, `%${categoryId}%`]
        });
        console.log('Products mapped:', prodCountRes.rows[0]);

        // 3. Check sync logs
        const syncLogsRes = await client.execute({
            sql: 'SELECT * FROM exhibition_sync_logs WHERE target_category = ? ORDER BY created_at DESC LIMIT 5',
            args: [categoryId]
        });
        console.log('Recent sync logs:', syncLogsRes.rows);

    } catch (e) {
        console.error('Error:', e);
    }
}

check();
