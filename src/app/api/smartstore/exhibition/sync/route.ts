/**
 * 범용 전시 카테고리 & 태그 동기화 API (SSE 스트리밍, 병렬 처리)
 *
 * 상품의 네이버 전시 카테고리 + Seller Tags를 동시에 설정
 *
 * POST /api/smartstore/exhibition/sync
 * Body: { productNos: string[], displayCategoryIds?: string[], targetCategory?: string, internalCategory?: string }
 */
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { getSession } from '@/lib/auth';

export const maxDuration = 300; // 5분

const CONCURRENCY = 3; // 쓰기 작업이므로 scan보다 보수적
const BATCH_DELAY = 150;

const trimEnv = (key: string) => process.env[key]?.trim();

const DISPLAY_CATEGORY_MAP: Record<string, string | undefined> = {
    'NEW': trimEnv('SMARTSTORE_NEW_ID'),
    'CURATED': trimEnv('SMARTSTORE_CURATED_ID'),
    'MILITARY ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_MILITARY_ID'),
    'WORKWEAR ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_WORKWEAR_ID'),
    'OUTDOOR ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_OUTDOOR_ID'),
    'JAPANESE ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_JAPAN_ID'),
    'HERITAGE EUROPE': trimEnv('SMARTSTORE_ARCHIVE_EUROPE_ID'),
    'BRITISH ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_BRITISH_ID'),
    'UNISEX ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_UNISEX_ID'),
    'ARCHIVE': trimEnv('SMARTSTORE_ARCHIVE_ROOT_ID'),
    'CLEARANCE': trimEnv('SMARTSTORE_CLEARANCE_ID'),
    'CLEARANCE_KEEP': trimEnv('SMARTSTORE_CLEARANCE_ID'),
    'CLEARANCE_DISPOSE': trimEnv('SMARTSTORE_CLEARANCE_ID'),
};

const CATEGORY_TO_TAG: Record<string, string> = {
    'NEW': 'BS뉴',
    'CURATED': 'BS큐레이티드',
    'MILITARY ARCHIVE': 'BS밀리터리',
    'WORKWEAR ARCHIVE': 'BS워크웨어',
    'OUTDOOR ARCHIVE': 'BS아웃도어',
    'JAPANESE ARCHIVE': 'BS재팬',
    'HERITAGE EUROPE': 'BS유로빈티지',
    'BRITISH ARCHIVE': 'BS브리티시',
    'UNISEX ARCHIVE': 'BS유니섹스',
    'ARCHIVE': 'BS아카이브',
    'CLEARANCE': 'BS클리어런스',
    'CLEARANCE_KEEP': 'BS클리어런스',
    'CLEARANCE_DISPOSE': 'BS클리어런스',
};

export async function POST(request: Request) {
    const session = await getSession();
    await ensureDbInitialized();
    const body = await request.json();
    // internalCategory와 targetCategory 둘 다 지원
    const { productNos, displayCategoryIds, targetCategory, internalCategory } = body;
    const effectiveCategory = targetCategory || internalCategory;

    // displayCategoryIds 직접 지정 또는 카테고리명으로 자동 매핑
    let targetCategoryIds: string[] = [];

    if (Array.isArray(displayCategoryIds) && displayCategoryIds.length > 0) {
        targetCategoryIds = displayCategoryIds;
    } else if (effectiveCategory) {
        const mapped = DISPLAY_CATEGORY_MAP[effectiveCategory];
        if (mapped) {
            targetCategoryIds = [mapped];
        }
    }

    if (!Array.isArray(productNos) || productNos.length === 0) {
        return new Response(JSON.stringify({ error: '상품번호 배열이 필요합니다' }), { status: 400 });
    }

    if (targetCategoryIds.length === 0) {
        return new Response(JSON.stringify({ error: '전시카테고리 ID를 확인할 수 없습니다.' }), { status: 400 });
    }

    const categoryLabel = effectiveCategory || targetCategoryIds.join(',');
    const tagText = effectiveCategory ? CATEGORY_TO_TAG[effectiveCategory] : null;

    // SSE 스트리밍 응답
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { }
            };

            const total = productNos.length;
            const startTime = Date.now();

            send({
                type: 'start',
                total,
                message: `${total}개 상품 전시카테고리 전송 시작 (${categoryLabel})`,
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
            const syncedBy = session?.id || 'system';

            // 병렬 배치 처리
            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = productNos.slice(i, i + CONCURRENCY);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                const results = await Promise.allSettled(
                    batch.map(async (productNo: string) => {
                        // 1. 상세 조회
                        const detail = await getProductDetail(token, Number(productNo));
                        const originProduct = detail.originProduct;
                        const channelProduct = detail.smartstoreChannelProduct || {};
                        const productName = originProduct.name;

                        // 2. Prepare Tags
                        let finalTags = originProduct.detailAttribute?.seoInfo?.sellerTags || [];
                        if (tagText) {
                            const currentTags: { text: string }[] = finalTags;
                            const filteredTags = currentTags.filter((t: any) => !t.text?.startsWith('BS'));
                            const newTags = [...filteredTags, { text: tagText }];
                            finalTags = newTags.slice(0, 10);

                            if (!originProduct.detailAttribute) originProduct.detailAttribute = {};
                            if (!originProduct.detailAttribute.seoInfo) originProduct.detailAttribute.seoInfo = {};
                            originProduct.detailAttribute.seoInfo.sellerTags = finalTags;
                        }

                        // 3. Update Payload - 기존 channelProduct 속성 유지 (channelProductDisplayStatusType 필수)
                        const payload = {
                            originProduct: originProduct,
                            smartstoreChannelProduct: {
                                ...channelProduct,
                                channelProductDisplayCategoryNoList: targetCategoryIds
                            }
                        };

                        // 4. PUT 요청
                        await updateProduct(token, Number(productNo), payload);

                        // 5. DB 로그
                        try {
                            await db.query(`
                                INSERT INTO exhibition_sync_logs (product_no, product_name, target_category, status, synced_by)
                                VALUES ($1, $2, $3, $4, $5)
                            `, [productNo, productName, categoryLabel, 'SUCCESS', syncedBy]);
                        } catch { }

                        // 6. 로컬 맵 업데이트
                        try {
                            await db.query(`
                                INSERT INTO naver_product_map (origin_product_no, naver_display_category, display_category_ids, display_scanned_at, seller_tags)
                                VALUES ($1, $2, $3, datetime('now'), $4)
                                ON CONFLICT(origin_product_no) DO UPDATE SET
                                naver_display_category = EXCLUDED.naver_display_category,
                                display_category_ids = EXCLUDED.display_category_ids,
                                display_scanned_at = EXCLUDED.display_scanned_at,
                                seller_tags = EXCLUDED.seller_tags
                            `, [productNo, categoryLabel, JSON.stringify(targetCategoryIds), finalTags.map((t: any) => t.text).join(',')]);
                        } catch { }

                        return { productNo, productName, success: true };
                    })
                );

                // 결과 집계
                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        successCount++;
                        send({
                            type: 'result',
                            success: true,
                            current: successCount + failCount,
                            total,
                            productNo: result.value.productNo,
                            message: `[${successCount + failCount}/${total}] ${result.value.productName} ✓`,
                        });
                    } else {
                        failCount++;
                        const errMsg = result.reason?.message || '알 수 없는 오류';
                        send({
                            type: 'result',
                            success: false,
                            current: successCount + failCount,
                            total,
                            message: `[${successCount + failCount}/${total}] 실패: ${errMsg}`,
                        });

                        // 실패 로그
                        try {
                            await db.query(`
                                INSERT INTO exhibition_sync_logs (product_no, product_name, target_category, status, error_message, synced_by)
                                VALUES ($1, $2, $3, $4, $5, $6)
                            `, [batch[results.indexOf(result)] || 'unknown', 'Unknown', categoryLabel, 'FAIL', errMsg, syncedBy]);
                        } catch { }
                    }
                }

                // 진행률 이벤트
                const processed = successCount + failCount;
                send({
                    type: 'progress',
                    current: processed,
                    total,
                    elapsed: `${elapsed}초`,
                    message: `[${processed}/${total}] 전송 중... (${elapsed}초)`,
                });

                if (i + CONCURRENCY < total) await new Promise(r => setTimeout(r, BATCH_DELAY));
            }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            send({
                type: 'complete',
                total,
                success: successCount,
                failed: failCount,
                totalTime,
                message: `전송 완료: ${successCount}개 성공, ${failCount}개 실패 (${totalTime}초)`,
            });

            controller.close();
        },
    });

    return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}
