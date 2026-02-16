import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob;
        const productNo = formData.get('productNo') as string;

        if (!file || !productNo) {
            return NextResponse.json({ error: 'Missing file or productNo' }, { status: 400 });
        }

        const fileName = `${productNo}.jpg`;

        // 1. Try Vercel Blob (Recommended for Production)
        if (process.env.BLOB_READ_WRITE_TOKEN) {
            console.log(`[Upload API] Using Vercel Blob: thumbnails/generated/${fileName}`);
            const blob = await put(`thumbnails/generated/${fileName}`, file, {
                access: 'public',
                contentType: 'image/jpeg',
            });

            return NextResponse.json({
                success: true,
                url: blob.url
            });
        }

        // 2. Fallback to Local Storage (Development only - fails on Vercel)
        console.warn(`[Upload API] BLOB_READ_WRITE_TOKEN missing. Using local storage fallback.`);
        const buffer = Buffer.from(await file.arrayBuffer());
        const outputDir = path.join(process.cwd(), 'public', 'thumbnails', 'generated');

        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const outputPath = path.join(outputDir, fileName);
            fs.writeFileSync(outputPath, buffer);

            return NextResponse.json({
                success: true,
                url: `/thumbnails/generated/${fileName}`
            });
        } catch (localError: any) {
            const isReadOnly = localError.code === 'EROFS' || localError.message.includes('read-only');
            return NextResponse.json({
                error: isReadOnly
                    ? '서버 환경이 읽기 전용입니다. Vercel 대시보드에서 Storage -> Blob을 생성하고 토큰을 연결해주세요.'
                    : `저장 실패: ${localError.message}`,
                code: isReadOnly ? 'READ_ONLY_FILESYSTEM' : 'WRITE_FAILED'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Upload API] General Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
