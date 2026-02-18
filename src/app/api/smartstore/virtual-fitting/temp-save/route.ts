import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// 피팅 결과 임시 저장
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { productNo, resultUrl, productName, archiveCategory } = await request.json();

        if (!productNo || !resultUrl) {
            return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
        }

        const id = `temp-${productNo}-${Date.now()}`;

        await db.query(
            `INSERT INTO fitting_results (id, product_no, model_id, result_image_url, status, prompt_used)
             VALUES ($1, $2, 'temp', $3, 'temp_saved', $4)`,
            [id, productNo, resultUrl, JSON.stringify({ productName, archiveCategory, savedAt: new Date().toISOString() })]
        );

        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 임시 저장 목록 조회
export async function GET() {
    try {
        await ensureDbInitialized();

        const { rows } = await db.query(
            `SELECT id, product_no, result_image_url, prompt_used, created_at
             FROM fitting_results
             WHERE status = 'temp_saved'
             ORDER BY created_at DESC`
        );

        return NextResponse.json({ success: true, results: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
