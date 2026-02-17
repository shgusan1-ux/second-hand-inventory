/**
 * sellerTags Update API (SSE Streaming, Parallel)
 *
 * Updates sellerTags on Naver based on internal category (e.g. NEW -> BS뉴)
 * Also updates local `naver_product_map`.
 *
 * POST /api/smartstore/tags/update
 * Body: { productNos: string[], category: string }
 */
import { getNaverToken, getProductDetail, updateProduct } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export const maxDuration = 300;

const CONCURRENCY = 5;
const BATCH_DELAY = 200;

// Internal Category -> sellerTag Text Mapping
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
    await ensureDbInitialized();

    // Ensure column exists
    try {
        await db.query(`ALTER TABLE naver_product_map ADD COLUMN seller_tags TEXT`);
    } catch { /* Column likely exists */ }

    const body = await request.json().catch(() => ({}));
    const productNos: string[] = body.productNos || [];
    const category: string = body.category || '';

    const tagText = CATEGORY_TO_TAG[category];
    if (!tagText) {
        return new Response(JSON.stringify({
            error: `지원하지 않는 카테고리: ${category}. 가능한 값: ${Object.keys(CATEGORY_TO_TAG).join(', ')}`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (productNos.length === 0) {
        return new Response(JSON.stringify({ error: '상품번호 배열이 필요합니다' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { }
            };

            const total = productNos.length;
            const startTime = Date.now();
            const now = new Date().toISOString();

            send({
                type: 'start',
                total,
                category,
                tagText,
                message: `${total}개 상품에 "${tagText}" 태그 쓰기 시작 (${CONCURRENCY}개 병렬)`,
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
            let skipCount = 0;

            // Parallel Batch Processing
            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = productNos.slice(i, i + CONCURRENCY);

                const results = await Promise.allSettled(
                    batch.map(async (productNo) => {
                        // 1. Get Detail
                        const detail = await getProductDetail(token, Number(productNo));
                        const originProduct = detail.originProduct;
                        const productName = (originProduct?.name || '').substring(0, 100);

                        // 2. Check existing tags
                        const currentTags: { text: string }[] =
                            originProduct?.detailAttribute?.seoInfo?.sellerTags || [];

                        // Skip if tag already exists
                        if (currentTags.some(t => t.text === tagText)) {
                            // Update local DB just in case
                            await db.query(`
                                INSERT INTO naver_product_map (origin_product_no, name, seller_tags)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (origin_product_no) DO UPDATE SET
                                    seller_tags = EXCLUDED.seller_tags,
                                    name = COALESCE(EXCLUDED.name, naver_product_map.name)
                            `, [productNo, productName, currentTags.map(t => t.text).join(',')]);
                            return { productNo, productName, skipped: true };
                        }

                        // 3. Remove existing 'BS*' tags and add new one
                        const filteredTags = currentTags.filter(t => !t.text?.startsWith('BS'));
                        const newTags = [...filteredTags, { text: tagText }];
                        // Naver limit: 10 tags
                        const finalTags = newTags.slice(0, 10);

                        // 4. Update originProduct
                        if (!originProduct.detailAttribute) originProduct.detailAttribute = {};
                        if (!originProduct.detailAttribute.seoInfo) originProduct.detailAttribute.seoInfo = {};
                        originProduct.detailAttribute.seoInfo.sellerTags = finalTags;

                        // 5. PUT Update
                        const updatePayload = {
                            originProduct: originProduct,
                            smartstoreChannelProduct: detail.smartstoreChannelProduct,
                        };
                        await updateProduct(token, Number(productNo), updatePayload);

                        // Update local DB
                        await db.query(`
                            INSERT INTO naver_product_map (origin_product_no, name, seller_tags)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (origin_product_no) DO UPDATE SET
                                seller_tags = EXCLUDED.seller_tags,
                                name = COALESCE(EXCLUDED.name, naver_product_map.name)
                        `, [productNo, productName, finalTags.map(t => t.text).join(',')]);

                        return { productNo, productName, skipped: false };
                    })
                );

                // Process results
                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        const { skipped } = result.value;
                        if (skipped) skipCount++;
                        else successCount++;
                    } else {
                        failCount++;
                    }
                }

                const processed = Math.min(i + CONCURRENCY, total);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                send({
                    type: 'progress',
                    current: processed,
                    total,
                    success: successCount,
                    failed: failCount,
                    skipped: skipCount,
                    elapsed: `${elapsed}초`,
                    message: `[${processed}/${total}] 태그 처리 (${successCount}성공, ${skipCount}스킵, ${failCount}실패)`,
                });

                if (i + CONCURRENCY < total) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY));
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
                message: `태그 작업 완료! (${successCount}개 변경, ${skipCount}개 유지)`,
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
