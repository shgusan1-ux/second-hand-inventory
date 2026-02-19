import { NextRequest, NextResponse } from 'next/server';
import { generateMDDescription } from '@/lib/ai-automation';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, brand, category, condition, size, fabric, imageUrl } = body;

        if (!name) {
            return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 });
        }

        const mdDescription = await generateMDDescription({
            name, brand, category, condition, size, fabric, imageUrl
        });

        return NextResponse.json({ success: true, mdDescription });
    } catch (error: any) {
        console.error('[MD Generate API] Error:', error);
        return NextResponse.json({ error: error.message || 'MD 소개글 생성 실패' }, { status: 500 });
    }
}
