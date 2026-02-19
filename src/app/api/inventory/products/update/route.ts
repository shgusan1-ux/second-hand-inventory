import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const body = await request.json();
        const { id, name, brand, category, price_consumer, price_sell, status, condition, size, fabric, md_comment, master_reg_date, images } = body;

        if (!id) {
            return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 });
        }

        // 이미지 처리
        const imageList: string[] = Array.isArray(images) ? images.filter(Boolean) : [];
        const image_url = imageList.length > 0 ? imageList[0] : '';
        const imagesJson = JSON.stringify(imageList);

        const finalParams: any[] = [
            name || '', brand || '', category || '',
            Number(price_consumer) || 0, Number(price_sell) || 0,
            status || '판매중', condition || '',
            image_url, md_comment || '', imagesJson,
            size || '', fabric || '', master_reg_date || null,
            id,
        ];

        // sold_at은 판매완료 시에만 설정, 그 외엔 NULL로 리셋
        const sold_at_clause = status === '판매완료' ? `sold_at='${new Date().toISOString()}'` : 'sold_at=NULL';

        const finalQuery = `UPDATE products SET name=$1, brand=$2, category=$3, price_consumer=$4, price_sell=$5, status=$6, condition=$7, image_url=$8, md_comment=$9, images=$10, size=$11, fabric=$12, master_reg_date=COALESCE($13, master_reg_date), ${sold_at_clause}, updated_at=CURRENT_TIMESTAMP, ai_completed=1 WHERE id=$14`;

        await db.query(finalQuery, finalParams);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Product Update API] Error:', error);
        return NextResponse.json({ error: error.message || '저장 실패' }, { status: 500 });
    }
}
