import { NextResponse } from 'next/server';

// 매분 실행: 서버리스 함수 콜드스타트 방지 + Edge 캐시 갱신
// Vercel Cron에서 호출 → 주요 API를 미리 호출해서 따뜻하게 유지
export async function GET() {
    const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'https://factory.brownstreet.co.kr';

    try {
        // 주요 API 동시 워밍 (Edge 캐시도 갱신)
        await Promise.all([
            fetch(`${base}/api/inventory/list?limit=50`),
            fetch(`${base}/api/inventory/stats`),
            fetch(`${base}/api/inventory/categories`),
        ]);

        return NextResponse.json({ ok: true, warmed: 3 });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message });
    }
}
