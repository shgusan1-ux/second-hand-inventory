import { NextRequest, NextResponse } from 'next/server';
import { polishProductDraft } from '@/lib/ai-automation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, brand, md_comment, fabric, size } = body;

        const result = await polishProductDraft({
            name,
            brand,
            md_comment,
            fabric,
            size
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('AI polish error:', error);
        return NextResponse.json(
            { error: 'AI 교정 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
