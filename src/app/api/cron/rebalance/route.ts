
import { NextResponse } from 'next/server';
import { executeRebalance } from '@/app/api/smartstore/products/rebalance/route';
import { invalidateProductCache } from '@/app/api/smartstore/products/route';

// Vercel Cron: 매일 00:00 KST (15:00 UTC) 자동 재배치
export async function GET(request: Request) {
    const startTime = Date.now();
    console.log('[Cron Rebalance] 시작:', new Date().toISOString());

    try {
        // 1. 캐시 무효화
        invalidateProductCache();

        // 2. 내부 키로 상품 API 호출 (미들웨어 우회)
        const url = new URL(request.url);
        const baseUrl = `${url.protocol}//${url.host}`;

        const res = await fetch(`${baseUrl}/api/smartstore/products?fetchAll=true&invalidateCache=true&_internal=bs-internal-2024`, {
            headers: { 'User-Agent': 'Cron-Rebalance/1.0' },
        });
        const data = await res.json();

        if (!data.success || !data.data?.contents) {
            console.error('[Cron Rebalance] 상품 로드 실패:', data.error);
            return NextResponse.json({ success: false, error: '상품 데이터 로드 실패' }, { status: 500 });
        }

        console.log(`[Cron Rebalance] 상품 ${data.data.contents.length}개 로드 완료`);

        // 3. 재배치 실행
        const summary = await executeRebalance(data.data.contents);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Cron Rebalance] 완료: ${summary.moved}개 이동 (${duration}초)`);
        console.log('[Cron Rebalance] 상세:', JSON.stringify(summary.moves));

        return NextResponse.json({
            success: true,
            message: `재배치 완료: ${summary.moved}개 이동 (${duration}초)`,
            summary,
        });
    } catch (error: any) {
        console.error('[Cron Rebalance] 오류:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
