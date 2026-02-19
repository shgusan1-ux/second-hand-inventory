import { NextResponse } from 'next/server';
import { getAllNaverStats } from '@/lib/naver/apis/stats';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;

    try {
        const stats = await getAllNaverStats(date);
        return NextResponse.json({ success: true, data: stats });
    } catch (error: any) {
        console.error('[NaverStatsAPI] Error:', error.message);

        return NextResponse.json({
            success: false,
            error: error.message,
            message: '데이터를 가져오는 도중 오류가 발생했습니다. 권한 설정을 확인해주세요.'
        }, { status: 500 });
    }
}
