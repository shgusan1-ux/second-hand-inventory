import { NextResponse } from 'next/server';
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { calculateSalesScore } from '@/lib/smartstore-rank';
import { getMarketWeather } from '@/lib/weather';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export const maxDuration = 300; // 5 minutes

const DISPLAY_CATEGORY_MAP: Record<string, string | undefined> = {
    'NEW': process.env.SMARTSTORE_NEW_ID,
    'CURATED': process.env.SMARTSTORE_CURATED_ID,
    'ARCHIVE': process.env.SMARTSTORE_ARCHIVE_ROOT_ID,
};

const CATEGORY_TO_TAG: Record<string, string> = {
    'NEW': 'BS뉴',
    'CURATED': 'BS큐레이티드',
    'ARCHIVE': 'BS아카이브',
};

/**
 * 매일 00:00에 실행되어야 하는 자동 갱신 로직
 * 1. 실시간 날씨 데이터 수집
 * 2. 전체 상품 판매지수 재계산 (날씨 반영)
 * 3. NEW, CURATED, ARCHIVE의 판매지수 상위 50개 선별
 * 4. 선정된 50개를 네이버 스마트스토어 전시 카테고리에 자동 동기화
 */
export async function GET(request: Request) {
    // 보안: Vercel Cron 헤더 또는 쿼리 시크릿 확인 (필요시 활성화)
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { return new Response('Unauthorized', { status: 401 }); }

    console.log('[Midnight Cron] 갱신 로직 시작...');

    try {
        await ensureDbInitialized();

        // 1. 현재 날씨/온도 가져오기
        const weather = await getMarketWeather();
        const currentTemp = weather.averageTemp;
        console.log(`[Midnight Cron] 현재 온도: ${currentTemp}°C`);

        // 2. 전체 상품 데이터 가져오기 (내부 캐시 무효화 및 전체 조회)
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const productsRes = await fetch(`${baseUrl}/api/smartstore/products?fetchAll=true&invalidateCache=true&_internal=midnight-cron`, {
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!productsRes.ok) {
            throw new Error(`상품 목록 조회 실패: ${productsRes.status}`);
        }

        const productsData = await productsRes.json();
        const rawProducts = productsData.data.contents;
        console.log(`[Midnight Cron] ${rawProducts.length}개 상품 분석 시작`);

        // 3. 카테고리별 동기화 루프
        const categories = ['NEW', 'CURATED', 'ARCHIVE'] as const;
        const syncResults: any[] = [];

        const tokenData = await getNaverToken();
        const token = tokenData.access_token;

        for (const cat of categories) {
            const targetDisplayId = DISPLAY_CATEGORY_MAP[cat];
            if (!targetDisplayId) {
                console.warn(`[Midnight Cron] ${cat} 카테고리 ID가 설정되지 않았습니다.`);
                continue;
            }

            // A. 필터링 및 점수 계산 (날씨 반영)
            const filtered = rawProducts.filter((p: any) => {
                if (p.classification?.gender === 'KIDS') return false;
                const itemCat = p.internalCategory || '';
                if (cat === 'NEW') return itemCat === 'NEW';
                if (cat === 'CURATED') return itemCat === 'CURATED';
                return itemCat === 'ARCHIVE' || itemCat.includes('ARCHIVE');
            });

            const scored = filtered
                .map((p: any) => ({
                    ...p,
                    _score: calculateSalesScore(p, currentTemp)
                }))
                .sort((a: any, b: any) => b._score - a._score)
                .slice(0, 50);

            console.log(`[Midnight Cron] ${cat} 상위 ${scored.length}개 선정 완료`);

            // B. 네이버 전송
            let success = 0;
            let fail = 0;
            const tagText = CATEGORY_TO_TAG[cat];

            for (const p of scored) {
                try {
                    const productNo = Number(p.originProductNo);
                    const detail = await getProductDetail(token, productNo);
                    const originProduct = detail.originProduct;
                    const channelProduct = detail.smartstoreChannelProduct || {};

                    // 태그 업데이트
                    let finalTags = originProduct.detailAttribute?.seoInfo?.sellerTags || [];
                    if (tagText) {
                        const filteredTags = finalTags.filter((t: any) => !t.text?.startsWith('BS'));
                        finalTags = [...filteredTags, { text: tagText }].slice(0, 10);

                        if (!originProduct.detailAttribute) originProduct.detailAttribute = {};
                        if (!originProduct.detailAttribute.seoInfo) originProduct.detailAttribute.seoInfo = {};
                        originProduct.detailAttribute.seoInfo.sellerTags = finalTags;
                    }

                    // 전시 카테고리 업데이트
                    const payload = {
                        originProduct: originProduct,
                        smartstoreChannelProduct: {
                            ...channelProduct,
                            channelProductDisplayCategoryNoList: [targetDisplayId]
                        }
                    };

                    await updateProduct(token, productNo, payload);

                    // DB 로그 및 상태 업데이트
                    await db.query(`
                        INSERT INTO exhibition_sync_logs (product_no, product_name, target_category, status, synced_by)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [p.originProductNo, p.name, cat, 'SUCCESS', 'auto-midnight']);

                    success++;
                } catch (err: any) {
                    console.error(`[Midnight Cron] ${p.name} 전송 실패:`, err.message);
                    fail++;
                }
            }

            syncResults.push({ category: cat, total: scored.length, success, fail });
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            weather: { temp: currentTemp, condition: weather.dominantCondition },
            results: syncResults
        });

    } catch (error: any) {
        console.error('[Midnight Cron] 오류 발생:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
