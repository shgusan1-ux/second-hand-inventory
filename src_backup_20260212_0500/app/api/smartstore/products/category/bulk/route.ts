
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { productNos, category } = body;

        if (!Array.isArray(productNos) || productNos.length === 0 || !category) {
            return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
        }

        const values: any[] = [];
        const valueStrings: string[] = [];
        const now = new Date();

        productNos.forEach((id: string, index: number) => {
            const base = index * 3;
            values.push(id);
            values.push(category);
            values.push(now);
            valueStrings.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        });

        const query = `
            INSERT INTO product_overrides (id, internal_category, updated_at)
            VALUES ${valueStrings.join(',')}
            ON CONFLICT (id) DO UPDATE 
            SET internal_category = EXCLUDED.internal_category,
                updated_at = EXCLUDED.updated_at
        `;

        await db.query(query, values);

        return handleSuccess({
            success: true,
            count: productNos.length,
            message: `${productNos.length}개 상품의 카테고리가 ${category}(으)로 업데이트되었습니다.`
        });

    } catch (error: any) {
        return handleApiError(error, 'Bulk Category Update');
    }
}
