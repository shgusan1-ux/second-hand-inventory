import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// 바코드 또는 상품코드로 공급사 원본 데이터 조회
export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const barcode = searchParams.get('barcode');
        const productCode = searchParams.get('code');
        const name = searchParams.get('name');
        const brand = searchParams.get('brand');

        let query = '';
        let params: any[] = [];

        if (barcode) {
            // 물류바코드로 조회 (정확 매칭)
            query = 'SELECT * FROM supplier_products WHERE barcode = $1';
            params = [barcode];
        } else if (productCode) {
            // 상품코드로 조회
            query = 'SELECT * FROM supplier_products WHERE product_code = $1';
            params = [productCode];
        } else if (name && brand) {
            // 상품명 + 브랜드로 유사 검색
            query = 'SELECT * FROM supplier_products WHERE brand LIKE $1 AND name LIKE $2 LIMIT 10';
            params = [`%${brand}%`, `%${name}%`];
        } else if (name) {
            query = 'SELECT * FROM supplier_products WHERE name LIKE $1 LIMIT 10';
            params = [`%${name}%`];
        } else {
            return NextResponse.json({ error: 'barcode, code, 또는 name 파라미터가 필요합니다.' }, { status: 400 });
        }

        const { rows } = await db.query(query, params);

        return NextResponse.json({ data: rows });
    } catch (error: any) {
        console.error('[Supplier Lookup API] Error:', error);
        return NextResponse.json({ error: error.message || '조회 실패' }, { status: 500 });
    }
}
