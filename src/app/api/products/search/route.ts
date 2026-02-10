import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ products: [] });
        }

        // 상품명, 브랜드, ID로 검색
        const searchPattern = `%${query}%`;
        const result = await db.query(`
            SELECT
                id,
                name,
                brand,
                category,
                image_url,
                price_consumer,
                price_sell,
                status
            FROM products
            WHERE
                name LIKE $1
                OR brand LIKE $1
                OR CAST(id AS TEXT) LIKE $1
            ORDER BY created_at DESC
            LIMIT 20
        `, [searchPattern]);

        return NextResponse.json({ products: result.rows });
    } catch (error) {
        console.error('Product search error:', error);
        return NextResponse.json(
            { error: '상품 검색 중 오류가 발생했습니다', products: [] },
            { status: 500 }
        );
    }
}
