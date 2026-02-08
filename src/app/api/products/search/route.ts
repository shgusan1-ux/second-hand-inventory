import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json({ products: [] });
        }

        // 상품명, 브랜드, ID로 검색
        const result = await sql`
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
                name ILIKE ${'%' + query + '%'}
                OR brand ILIKE ${'%' + query + '%'}
                OR id::text ILIKE ${'%' + query + '%'}
            ORDER BY created_at DESC
            LIMIT 20
        `;

        return NextResponse.json({ products: result.rows });
    } catch (error) {
        console.error('Product search error:', error);
        return NextResponse.json(
            { error: '상품 검색 중 오류가 발생했습니다', products: [] },
            { status: 500 }
        );
    }
}
