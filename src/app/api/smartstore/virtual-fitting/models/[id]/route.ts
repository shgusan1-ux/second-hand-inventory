import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// DELETE: 모델 삭제
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await ensureDbInitialized();
        const { id } = await params;

        // DB에서 모델 정보 조회
        const { rows } = await db.query('SELECT * FROM fitting_models WHERE id = $1', [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: '모델을 찾을 수 없습니다' }, { status: 404 });
        }

        // Vercel Blob에서 삭제
        try {
            await del(rows[0].image_url);
        } catch (e) {
            console.warn('[Model Delete] Blob 삭제 실패 (무시):', e);
        }

        // DB에서 삭제
        await db.query('DELETE FROM fitting_models WHERE id = $1', [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
