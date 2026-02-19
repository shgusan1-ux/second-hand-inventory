import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export async function GET() {
    try {
        await ensureDbInitialized();

        const { rows: countRows } = await db.query('SELECT count(*) as total FROM supplier_products');
        const total = parseInt(countRows[0]?.total || '0');

        if (total === 0) {
            return NextResponse.json({
                total: 0,
                genders: {},
                categories: {},
                brands_count: 0,
                with_measurements: 0,
            });
        }

        // 성별 분포
        const { rows: genderRows } = await db.query(
            "SELECT gender, count(*) as cnt FROM supplier_products GROUP BY gender ORDER BY cnt DESC"
        );
        const genders: Record<string, number> = {};
        genderRows.forEach((r: any) => { genders[r.gender || '미분류'] = parseInt(r.cnt); });

        // 카테고리 분포
        const { rows: catRows } = await db.query(
            "SELECT category1, count(*) as cnt FROM supplier_products GROUP BY category1 ORDER BY cnt DESC LIMIT 20"
        );
        const categories: Record<string, number> = {};
        catRows.forEach((r: any) => { categories[r.category1 || '미분류'] = parseInt(r.cnt); });

        // 브랜드 수
        const { rows: brandRows } = await db.query(
            "SELECT count(DISTINCT brand) as cnt FROM supplier_products WHERE brand IS NOT NULL AND brand != ''"
        );
        const brands_count = parseInt(brandRows[0]?.cnt || '0');

        // 실측 사이즈 보유 상품 수 (길이 또는 가슴 있음)
        const { rows: measRows } = await db.query(
            "SELECT count(*) as cnt FROM supplier_products WHERE length1 IS NOT NULL OR chest IS NOT NULL"
        );
        const with_measurements = parseInt(measRows[0]?.cnt || '0');

        // 최근 등록일
        const { rows: lastRows } = await db.query(
            "SELECT created_at FROM supplier_products ORDER BY created_at DESC LIMIT 1"
        );

        return NextResponse.json({
            total,
            genders,
            categories,
            brands_count,
            with_measurements,
            last_uploaded: lastRows[0]?.created_at || null,
        });
    } catch (error: any) {
        console.error('[Supplier Stats API] Error:', error);
        return NextResponse.json({ error: error.message || '통계 조회 실패' }, { status: 500 });
    }
}
