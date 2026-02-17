
import { db } from './src/lib/db';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    const categoryId = 'bedf1e439281477fb6383cfb1770eea9';
    try {
        console.log('Checking category:', categoryId);

        // 1. Check in naver_categories
        const catRes = await db.query('SELECT * FROM naver_categories WHERE id = ?', [categoryId]);
        console.log('Category details in DB:', catRes.rows);

        // 2. Count products in this category
        const prodCountRes = await db.query('SELECT count(*) as count FROM naver_product_map WHERE naver_display_category LIKE ?', [`%${categoryId}%`]);
        console.log('Products mapped to this category:', prodCountRes.rows[0]);

        // 3. Check recent sync logs for this category
        const syncLogsRes = await db.query('SELECT * FROM exhibition_sync_logs WHERE target_category = ? ORDER BY created_at DESC LIMIT 5', [categoryId]);
        console.log('Recent sync logs for this category:', syncLogsRes.rows);

    } catch (e) {
        console.error('Error checking category:', e);
    }
}

check();
