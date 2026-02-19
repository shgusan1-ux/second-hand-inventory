import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// GET: 피팅 완료된 상품 목록 조회
export async function GET() {
    try {
        await ensureDbInitialized();

        const { rows } = await db.query(
            `SELECT f.product_no, f.result_image_url
             FROM fitting_results f
             INNER JOIN (
                 SELECT product_no, MAX(created_at) as max_created
                 FROM fitting_results
                 WHERE status = 'completed'
                 GROUP BY product_no
             ) latest ON f.product_no = latest.product_no AND f.created_at = latest.max_created
             WHERE f.status = 'completed'`
        );

        return NextResponse.json({ results: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
    }
}
