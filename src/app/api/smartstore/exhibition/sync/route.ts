/**
 * 범용 전시 카테고리 동기화 API (SSE Streaming)
 *
 * 상품의 네이버 전시 카테고리를 지정된 카테고리로 설정
 * channelProductDisplayCategoryNoList는 쓰기 전용 필드 (PUT으로 설정, GET에서 미반환)
 *
 * POST /api/smartstore/exhibition/sync
 * Body: { productNos: string[], displayCategoryIds: string[] }
 */
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const maxDuration = 300; // 5분

// ... (DISPLAY_CATEGORY_MAP mapping)
const DISPLAY_CATEGORY_MAP: Record<string, string | undefined> = {
    'NEW': process.env.SMARTSTORE_NEW_ID,
    'CURATED': process.env.SMARTSTORE_CURATED_ID,
    'MILITARY ARCHIVE': process.env.SMARTSTORE_ARCHIVE_MILITARY_ID,
    'WORKWEAR ARCHIVE': process.env.SMARTSTORE_ARCHIVE_WORKWEAR_ID,
    'OUTDOOR ARCHIVE': process.env.SMARTSTORE_ARCHIVE_OUTDOOR_ID,
    'JAPANESE ARCHIVE': process.env.SMARTSTORE_ARCHIVE_JAPAN_ID,
    'HERITAGE EUROPE': process.env.SMARTSTORE_ARCHIVE_EUROPE_ID,
    'BRITISH ARCHIVE': process.env.SMARTSTORE_ARCHIVE_BRITISH_ID,
    'UNISEX ARCHIVE': process.env.SMARTSTORE_ARCHIVE_UNISEX_ID,
    'ARCHIVE': process.env.SMARTSTORE_ARCHIVE_ROOT_ID,
    'CLEARANCE': process.env.SMARTSTORE_CLEARANCE_ID,
    'CLEARANCE_KEEP': process.env.SMARTSTORE_CLEARANCE_ID,
    'CLEARANCE_DISPOSE': process.env.SMARTSTORE_CLEARANCE_ID,
};

export async function POST(request: Request) {
    const session = await getSession();
    const { productNos, displayCategoryIds, internalCategory } = await request.json();

    if (!Array.isArray(productNos) || productNos.length === 0) {
        return new Response(JSON.stringify({ error: '상품번호 배열이 필요합니다' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // displayCategoryIds 직접 지정 또는 internalCategory로 자동 매핑
    let targetCategoryIds: string[] = [];

    if (Array.isArray(displayCategoryIds) && displayCategoryIds.length > 0) {
        targetCategoryIds = displayCategoryIds;
    } else if (internalCategory) {
        const mapped = DISPLAY_CATEGORY_MAP[internalCategory];
        if (mapped) {
            targetCategoryIds = [mapped];
        }
    }

    if (targetCategoryIds.length === 0) {
        return new Response(JSON.stringify({ error: '전시카테고리 ID를 확인할 수 없습니다. displayCategoryIds 또는 internalCategory를 지정하세요.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            const total = productNos.length;
            const startTime = Date.now();
            const categoryLabel = internalCategory || targetCategoryIds.join(',');

            send({
                type: 'start',
                total,
                message: `${total}개 상품 → ${categoryLabel} 전시카테고리 동기화 시작`,
            });

            let token: string;
            try {
                const tokenData = await getNaverToken();
                token = tokenData.access_token;
            } catch (e: any) {
                send({ type: 'error', message: '토큰 발급 실패: ' + e.message });
                controller.close();
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < total; i++) {
                const productNo = productNos[i];
                let productName = 'Unknown';
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                send({
                    type: 'progress',
                    current: i + 1,
                    total,
                    productNo,
                    message: `[${i + 1}/${total}] 상품 ${productNo} 처리 중...`,
                });

                try {
                    // 1. 상세 조회
                    const detail = await getProductDetail(token, Number(productNo));
                    productName = (detail.originProduct?.name || '').substring(0, 100);

                    // 2. 전시 카테고리 업데이트
                    const updatePayload = {
                        originProduct: detail.originProduct,
                        smartstoreChannelProduct: {
                            ...(detail.smartstoreChannelProduct || {}),
                            channelProductDisplayCategoryNoList: targetCategoryIds,
                        },
                    };

                    await updateProduct(token, Number(productNo), updatePayload);
                    successCount++;

                    // DB 로그 기록 (성공)
                    await db.query(`
                        INSERT INTO exhibition_sync_logs (product_no, product_name, target_category, status, synced_by)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [productNo, productName, categoryLabel, 'SUCCESS', session?.id || 'system']);

                    send({
                        type: 'result',
                        current: i + 1,
                        total,
                        productNo,
                        productName: productName.substring(0, 30),
                        success: true,
                        elapsed: `${elapsed}초`,
                        message: `[${i + 1}/${total}] ${productName.substring(0, 30)} → ${categoryLabel} 설정 완료`,
                    });
                } catch (e: any) {
                    failCount++;
                    // DB 로그 기록 (실패)
                    await db.query(`
                        INSERT INTO exhibition_sync_logs (product_no, product_name, target_category, status, error_message, synced_by)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [productNo, productName, categoryLabel, 'FAIL', e.message, session?.id || 'system']);

                    send({
                        type: 'result',
                        current: i + 1,
                        total,
                        productNo,
                        productName,
                        success: false,
                        error: e.message,
                        elapsed: `${elapsed}초`,
                        message: `[${i + 1}/${total}] 상품 ${productNo} 실패: ${e.message}`,
                    });
                }

                // Rate limit 보호: 상품당 500ms 딜레이 (GET + PUT = 2콜)
                if (i < total - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

            send({
                type: 'complete',
                total,
                success: successCount,
                failed: failCount,
                totalTime: `${totalTime}초`,
                message: `완료! ${successCount}개 성공, ${failCount}개 실패 (총 ${totalTime}초)`,
            });

            controller.close();
        },
    });

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
