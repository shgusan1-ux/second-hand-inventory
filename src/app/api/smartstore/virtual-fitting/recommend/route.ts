import { NextRequest, NextResponse } from 'next/server';
import { rankProductsBySalesPotential } from '@/lib/virtual-fitting/recommendation';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const { products } = await request.json();

        // 이미 피팅 완료된 상품 조회
        const productNos = products.map((p: any) => p.originProductNo);
        const placeholders = productNos.map((_: any, i: number) => `$${i + 1}`).join(',');

        let fittedSet = new Set<string>();
        if (productNos.length > 0) {
            const { rows } = await db.query(
                `SELECT DISTINCT product_no FROM fitting_results WHERE status = 'completed' AND product_no IN (${placeholders})`,
                productNos
            );
            fittedSet = new Set(rows.map((r: any) => r.product_no));
        }

        // 순위 계산
        const enriched = products.map((p: any) => ({
            ...p,
            fittingDone: fittedSet.has(p.originProductNo),
        }));

        const ranked = rankProductsBySalesPotential(enriched);

        return NextResponse.json({ ranked });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
