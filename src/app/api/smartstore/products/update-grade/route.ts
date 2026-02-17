import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, grade } = body;

        if (!id || !grade) {
            return NextResponse.json({ success: false, error: 'ID and Grade are required' }, { status: 400 });
        }

        const validGrades = ['V', 'S', 'A', 'B', 'C'];
        const upperGrade = grade.toUpperCase();
        if (!validGrades.includes(upperGrade)) {
            return NextResponse.json({ success: false, error: 'Invalid grade' }, { status: 400 });
        }

        await ensureDbInitialized();

        // naver_products 테이블의 description_grade 업데이트
        await db.query(
            `UPDATE naver_products SET description_grade = $1 WHERE origin_product_no = $2`,
            [upperGrade, id]
        );

        return handleSuccess({ success: true, message: `등급이 ${upperGrade}급으로 업데이트되었습니다.` });
    } catch (error: any) {
        return handleApiError(error, 'Update Product Grade');
    }
}
