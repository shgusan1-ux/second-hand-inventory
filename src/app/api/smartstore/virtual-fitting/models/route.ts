import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// GET: 등록된 모델 목록
export async function GET() {
    try {
        await ensureDbInitialized();
        const { rows } = await db.query(
            'SELECT * FROM fitting_models ORDER BY type, created_at DESC'
        );
        return NextResponse.json({ models: rows });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: 모델 이미지 업로드
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const formData = await request.formData();
        const file = formData.get('file') as Blob;
        const type = formData.get('type') as string; // MAN, WOMAN, KIDS
        const name = formData.get('name') as string;
        const isDefault = formData.get('isDefault') === 'true';

        if (!file || !type || !name) {
            return NextResponse.json({ error: '파일, 타입, 이름이 필요합니다' }, { status: 400 });
        }

        if (!['MAN', 'WOMAN', 'KIDS'].includes(type)) {
            return NextResponse.json({ error: '타입은 MAN, WOMAN, KIDS 중 하나여야 합니다' }, { status: 400 });
        }

        const id = `model-${type.toLowerCase()}-${Date.now()}`;

        // Vercel Blob에 업로드
        const blob = await put(`fitting-models/${type}/${id}.jpg`, file, {
            access: 'public',
            contentType: 'image/jpeg',
            addRandomSuffix: false,
            allowOverwrite: true,
        });

        // 기본 모델 설정시 기존 기본 해제
        if (isDefault) {
            await db.query(
                'UPDATE fitting_models SET is_default = FALSE WHERE type = $1',
                [type]
            );
        }

        // DB에 저장
        await db.query(
            'INSERT INTO fitting_models (id, type, name, image_url, is_default) VALUES ($1, $2, $3, $4, $5)',
            [id, type, name, blob.url, isDefault]
        );

        return NextResponse.json({
            success: true,
            model: { id, type, name, image_url: blob.url, is_default: isDefault }
        });
    } catch (error: any) {
        console.error('[Model Upload Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
