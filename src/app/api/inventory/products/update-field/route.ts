import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// 단일 필드 업데이트 (수정완료 해제 등)
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { id, ...fields } = body;

        if (!id) {
            return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 });
        }

        const allowedFields = ['edit_completed'];
        const setClauses: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        for (const [key, value] of Object.entries(fields)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key}=$${paramIdx}`);
                params.push(value);
                paramIdx++;
            }
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400 });
        }

        params.push(id);
        await db.query(
            `UPDATE products SET ${setClauses.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=$${paramIdx}`,
            params
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Product Update Field API] Error:', error);
        return NextResponse.json({ error: error.message || '업데이트 실패' }, { status: 500 });
    }
}
