import { NextRequest, NextResponse } from 'next/server';
import { generateMDDescription, generateMoodImage } from '@/lib/ai-automation';
import { put } from '@vercel/blob';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, brand, category, condition, size, fabric, imageUrl, mode, productId } = body;

        if (!name) {
            return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 });
        }

        // 무드이미지 생성 모드
        if (mode === 'mood-image') {
            console.log('[MD Generate] 무드이미지 생성 시작:', { name, brand, category, imageUrl: imageUrl?.slice(0, 80) });
            const result = await generateMoodImage({ name, brand, category, imageUrl });
            if (!result) {
                console.error('[MD Generate] generateMoodImage returned null');
                return NextResponse.json({ error: '무드이미지 생성 실패 (Gemini 응답 없음)' }, { status: 500 });
            }

            // Base64 → Buffer → Vercel Blob 업로드
            console.log('[MD Generate] 이미지 생성 완료, Blob 업로드 시작, size:', result.imageBase64.length);
            const buffer = Buffer.from(result.imageBase64, 'base64');
            const ext = result.mimeType.includes('png') ? 'png' : 'jpg';
            const filename = `mood-images/${productId || Date.now()}.${ext}`;

            const blob = await put(filename, buffer, {
                access: 'public',
                contentType: result.mimeType,
            });

            console.log('[MD Generate] Blob 업로드 완료:', blob.url);
            return NextResponse.json({ success: true, moodImageUrl: blob.url });
        }

        // 기본: MD 텍스트 생성
        const mdDescription = await generateMDDescription({
            name, brand, category, condition, size, fabric, imageUrl
        });

        return NextResponse.json({ success: true, mdDescription });
    } catch (error: any) {
        console.error('[MD Generate API] Error:', error);
        return NextResponse.json({ error: error.message || 'MD 소개글 생성 실패' }, { status: 500 });
    }
}
