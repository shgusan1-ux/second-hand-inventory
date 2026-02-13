import { NextRequest, NextResponse } from 'next/server';
import { analyzeMDSogae } from '@/lib/md-sogae';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imageUrl, category } = body;

        if (!imageUrl || !category) {
            return NextResponse.json(
                { error: '이미지 URL과 카테고리는 필수입니다' },
                { status: 400 }
            );
        }

        // MD-SOGAE v2.9 통합 분석 실행
        const result = await analyzeMDSogae(imageUrl, category);

        return NextResponse.json(result);
    } catch (error) {
        console.error('MD-SOGAE API Error:', error);
        return NextResponse.json(
            { error: 'MD-SOGAE 분석 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
