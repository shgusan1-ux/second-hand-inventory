import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const result = await db.query(`
      SELECT archive, COUNT(*) as count 
      FROM products 
      WHERE status = '판매중'
      GROUP BY archive
    `);

        const summary = result.rows.reduce((acc: any, row: any) => {
            acc[row.archive || 'NEW'] = parseInt(row.count);
            return acc;
        }, {
            NEW: 0,
            CURATED: 0,
            MILITARY: 0,
            WORKWEAR: 0,
            JAPAN: 0,
            EUROPE: 0,
            BRITISH: 0,
            CLEARANCE: 0,
            ETC: 0
        });

        return NextResponse.json({ success: true, summary });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
