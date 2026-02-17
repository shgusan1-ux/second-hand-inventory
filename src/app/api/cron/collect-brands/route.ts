
import { NextResponse } from 'next/server';
import { collectDailyBrands } from '@/lib/brand-collector';
import { ensureDbInitialized } from '@/lib/db-init';

export const maxDuration = 300; // 5 minutes

/**
 * 매일 실행되는 브랜드 수집 크론
 * AI(Gemini)를 활용하여 새로운 패션 브랜드를 발굴하고 마스터 데이터베이스에 추가합니다.
 */
export async function GET(request: Request) {
    // Vercel Cron 헤더 또는 세션 확인 (모달에서 수동 실행 허용)
    const isCron = request.headers.get('x-vercel-cron') === '1';
    const isDev = process.env.NODE_ENV === 'development';
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    if (!isCron && !isDev && !force) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] 일일 브랜드 수집 시작...');

    try {
        await ensureDbInitialized();
        const result = await collectDailyBrands();

        return NextResponse.json({
            success: result.success,
            timestamp: new Date().toISOString(),
            collectedCount: result.count || 0,
            brands: result.brands || [],
            error: result.error
        });
    } catch (error: any) {
        console.error('[Cron] 브랜드 수집 실패:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
