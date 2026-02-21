import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// 스마트스토어 통계 + 브랜드 목록 (장기 캐싱용 분리 API)
// 자주 바뀌지 않는 데이터 → 5분 캐시
export async function GET() {
    try {
        await ensureDbInitialized();

        const [statsResult, brandsResult] = await Promise.all([
            db.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(np.seller_management_code) as registered,
                    COUNT(CASE WHEN np.status_type = 'SUSPENSION' THEN 1 END) as suspended,
                    COUNT(CASE WHEN np.status_type = 'OUTOFSTOCK' THEN 1 END) as outofstock
                FROM products p
                LEFT JOIN naver_products np ON p.id = np.seller_management_code
                WHERE p.status != '폐기'
            `, []),
            db.query(`SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC`, []),
        ]);

        const st = statsResult.rows[0];
        const smartstoreStats = {
            total: parseInt(st?.total || '0'),
            registered: parseInt(st?.registered || '0'),
            unregistered: parseInt(st?.total || '0') - parseInt(st?.registered || '0'),
            suspended: parseInt(st?.suspended || '0'),
            outofstock: parseInt(st?.outofstock || '0'),
        };

        const brands = brandsResult.rows.map((r: any) => r.brand);

        return NextResponse.json({
            smartstoreStats,
            brands,
        }, {
            headers: {
                // 5분 캐시, 10분 stale-while-revalidate (거의 안 바뀌는 데이터)
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error: any) {
        console.error('[Inventory Stats API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
