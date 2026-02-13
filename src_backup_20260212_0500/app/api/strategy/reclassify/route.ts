import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        // 1. Fetch all products that are NOT locked and are currently '판매중'
        const result = await db.query(`
      SELECT p.id, p.name, p.brand, p.created_at, p.master_reg_date, c.classification as cat_class
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      WHERE p.status = '판매중' AND (p.archive_locked IS FALSE OR p.archive_locked IS NULL)
    `);

        const products = result.rows;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        let updatedCount = 0;

        for (const p of products) {
            let archive = 'ETC';
            const regDate = p.master_reg_date ? new Date(p.master_reg_date) : new Date(p.created_at);

            // Rule 2: NEW (within 7 days)
            if (regDate >= sevenDaysAgo) {
                archive = 'NEW';
            }
            // Rule 3: CLEARANCE (60+ days)
            else if (regDate <= sixtyDaysAgo) {
                archive = 'CLEARANCE';
            }
            // Rule 4: Keyword Matching / Category Classification
            else {
                const searchText = `${p.name} ${p.brand}`.toUpperCase();

                if (p.cat_class) {
                    archive = p.cat_class; // Use category classification if available
                } else {
                    // Manual keyword fallback
                    if (/M65|MA-1|BDU|MILITARY|ARMY|NAVY|ALPHA|ROTHCO/i.test(searchText)) archive = 'MILITARY';
                    else if (/CARHARTT|DICKIES|DENIM|WORKWEAR|COVERALL/i.test(searchText)) archive = 'WORKWEAR';
                    else if (/VISVIM|KAPITAL|NEIGHBORHOOD|WTAPS|UNDERCOVER|YOHJI/i.test(searchText)) archive = 'JAPAN';
                    else if (/BARBOUR|BURBERRY|AQUASCUTUM|LAVENHAM/i.test(searchText)) archive = 'EUROPE';
                    else if (/FRED PERRY|BEN SHERMAN|BARACUTA|MARTENS|SMITH/i.test(searchText)) archive = 'BRITISH';
                }
            }

            await db.query(`UPDATE products SET archive = $1 WHERE id = $2`, [archive, p.id]);
            updatedCount++;
        }

        return NextResponse.json({ success: true, updatedCount });
    } catch (error: any) {
        console.error('Reclassify error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
