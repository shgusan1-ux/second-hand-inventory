import { NextRequest, NextResponse } from 'next/server';
import { analyzeProductComplete } from '@/lib/ai-automation';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { id, name, brand, category, imageUrl, price_consumer, size } = body;

        if (!imageUrl || !name) {
            return NextResponse.json(
                { error: '이미지 URL과 상품명은 필수입니다' },
                { status: 400 }
            );
        }

        const result = await analyzeProductComplete({
            id: id || 'temp',
            name,
            brand: brand || '',
            category: category || '기타',
            imageUrl,
            price_consumer: price_consumer || 0,
            size: size || ''
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('AI analysis error:', error);
        return NextResponse.json(
            { error: 'AI 분석 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
