/**
 * CLEARANCE 전시 카테고리 동기화 API (SSE Streaming)
 *
 * CLEARANCE 상품의 네이버 전시 카테고리를 CLEARANCE만 남기고 MAN/WOMAN 등 제거
 * channelProductDisplayCategoryNoList는 쓰기 전용 필드 (PUT으로 설정, GET에서 미반환)
 *
 * POST /api/smartstore/exhibition/sync-clearance
 * Body: { productNos: string[] }
 */
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';

export const maxDuration = 300; // 5분

// CLEARANCE 전시 카테고리 ID
const CLEARANCE_DISPLAY_CATEGORY_ID = '09f56197c74b4969ac44a18a7b5f8fb1';

export async function POST(request: Request) {
    const { productNos } = await request.json();

    if (!Array.isArray(productNos) || productNos.length === 0) {
        return new Response(JSON.stringify({ error: '상품번호 배열이 필요합니다' }), {
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

            send({
                type: 'start',
                total,
                message: `${total}개 상품 네이버 전시 카테고리 동기화 시작`,
            });

            // 토큰 발급
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
            let skipCount = 0;

            for (let i = 0; i < total; i++) {
                const productNo = productNos[i];
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
                    const productName = (detail.originProduct?.name || '').substring(0, 30);

                    // 2. 전시 카테고리를 CLEARANCE만으로 업데이트
                    const updatePayload = {
                        originProduct: detail.originProduct,
                        smartstoreChannelProduct: {
                            ...(detail.smartstoreChannelProduct || {}),
                            channelProductDisplayCategoryNoList: [CLEARANCE_DISPLAY_CATEGORY_ID],
                        },
                    };

                    await updateProduct(token, Number(productNo), updatePayload);
                    successCount++;

                    send({
                        type: 'result',
                        current: i + 1,
                        total,
                        productNo,
                        productName,
                        success: true,
                        elapsed: `${elapsed}초`,
                        message: `[${i + 1}/${total}] ${productName} → CLEARANCE 전시카테고리 설정 완료`,
                    });
                } catch (e: any) {
                    failCount++;
                    send({
                        type: 'result',
                        current: i + 1,
                        total,
                        productNo,
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
                skipped: skipCount,
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
