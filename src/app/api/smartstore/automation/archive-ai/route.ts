/**
 * AI Archive Classification API v3.1 (SSE Streaming)
 * Gemini 3 Pro — 통합 1콜 + 3개 병렬 처리
 * 7개 ARCHIVE: MILITARY, WORKWEAR, OUTDOOR, JAPANESE, HERITAGE EUROPE, BRITISH, UNISEX
 *
 * v3.1 변경:
 * - skipClassified 옵션: 이미 분류된 상품 자동 스킵 (기본 true)
 * - 스킵된 상품은 'skipped' SSE 이벤트로 기존 분류 결과 전송
 * - 중간에 끊겨도 이미 저장된 분류 결과는 유지됨
 */

import { classifyForArchive, type ArchiveAIResult } from '@/lib/ai-archive-engine';
import { db } from '@/lib/db';

export const maxDuration = 300; // 5분

const CONCURRENCY = 3;
const BATCH_DELAY = 1000;

// 유효한 아카이브 서브카테고리 (이미 분류 완료로 판단)
const ARCHIVE_SUBS = new Set([
    'MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE',
    'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE',
]);

export async function POST(request: Request) {
    const { products, skipClassified = true } = await request.json();

    if (!Array.isArray(products) || products.length === 0) {
        return new Response(JSON.stringify({ error: 'products 배열이 필요합니다' }), {
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

            const total = products.length;
            const startTime = Date.now();

            // 이미 분류된 상품 확인
            let toProcess = products;
            let skippedProducts: { id: string; category: string }[] = [];

            if (skipClassified) {
                const ids = products.map((p: any) => p.id);
                const placeholders = ids.map((_: string, i: number) => `$${i + 1}`).join(',');
                const existing = await db.query(
                    `SELECT id, internal_category FROM product_overrides WHERE id IN (${placeholders})`,
                    ids
                );

                const classifiedMap = new Map<string, string>();
                for (const row of existing.rows) {
                    if (ARCHIVE_SUBS.has(row.internal_category)) {
                        classifiedMap.set(row.id, row.internal_category);
                    }
                }

                toProcess = products.filter((p: any) => !classifiedMap.has(p.id));
                skippedProducts = products
                    .filter((p: any) => classifiedMap.has(p.id))
                    .map((p: any) => ({ id: p.id, category: classifiedMap.get(p.id)! }));
            }

            const processTotal = toProcess.length;
            const skippedCount = skippedProducts.length;

            send({
                type: 'start',
                total,
                toProcess: processTotal,
                skipped: skippedCount,
                concurrency: CONCURRENCY,
                message: skippedCount > 0
                    ? `${total}개 중 ${skippedCount}개 이미 분류됨 → ${processTotal}개만 AI 분류 시작`
                    : `${total}개 상품 AI 분류 시작 (${CONCURRENCY}개씩 병렬 처리)`,
            });

            // 이미 분류된 상품 스킵 이벤트 전송
            for (const sp of skippedProducts) {
                const product = products.find((p: any) => p.id === sp.id);
                const shortName = (product?.name || '').substring(0, 30);
                send({
                    type: 'skipped',
                    productId: sp.id,
                    product: shortName,
                    category: sp.category,
                    message: `⏭ ${shortName} → ${sp.category} (이미 분류됨)`,
                });
            }

            // 분류할 상품이 없으면 바로 완료
            if (processTotal === 0) {
                send({
                    type: 'complete',
                    total,
                    toProcess: 0,
                    skipped: skippedCount,
                    success: 0,
                    failed: 0,
                    totalTime: '0초',
                    avgPerItem: '-',
                    results: [],
                    message: `모든 상품이 이미 분류되어 있습니다 (${skippedCount}개 스킵)`,
                });
                controller.close();
                return;
            }

            const results: { productId: string; category: string; confidence: number; reason: string }[] = [];
            let successCount = 0;
            let failCount = 0;
            let completedCount = 0;

            // 배치 단위 병렬 처리
            for (let i = 0; i < processTotal; i += CONCURRENCY) {
                const batch = toProcess.slice(i, i + CONCURRENCY);
                const batchNum = Math.floor(i / CONCURRENCY) + 1;
                const totalBatches = Math.ceil(processTotal / CONCURRENCY);

                send({
                    type: 'batch_start',
                    batch: batchNum,
                    totalBatches,
                    items: batch.map((p: any) => (p.name || '').substring(0, 25)),
                    message: `배치 ${batchNum}/${totalBatches} 분석 중... (${batch.length}개 동시)`,
                });

                // 배치 내 병렬 실행
                const batchResults = await Promise.all(
                    batch.map(async (product: any, batchIdx: number) => {
                        const globalIdx = i + batchIdx;
                        const shortName = (product.name || '').substring(0, 30);

                        send({
                            type: 'progress',
                            current: globalIdx + 1,
                            total: processTotal,
                            product: shortName,
                            phase: 'analyzing',
                            message: `[${globalIdx + 1}/${processTotal}] ${shortName}... Gemini 3 Pro 분석 중`,
                        });

                        try {
                            const result: ArchiveAIResult = await classifyForArchive({
                                id: product.id,
                                name: product.name,
                                imageUrl: product.imageUrl,
                            });

                            // DB 저장 (1개씩 즉시)
                            const now = new Date();
                            await db.query(
                                `INSERT INTO product_overrides (id, internal_category, updated_at)
                                 VALUES ($1, $2, $3)
                                 ON CONFLICT (id) DO UPDATE
                                 SET internal_category = $2, updated_at = $3`,
                                [product.id, result.category, now]
                            );

                            completedCount++;
                            successCount++;

                            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                            const avgTime = completedCount > 0 ? ((Date.now() - startTime) / completedCount / 1000).toFixed(1) : '?';
                            const remaining = completedCount > 0 ? (((processTotal - completedCount) * (Date.now() - startTime) / completedCount) / 1000).toFixed(0) : '?';

                            send({
                                type: 'result',
                                current: globalIdx + 1,
                                total: processTotal,
                                completed: completedCount,
                                productId: product.id,
                                product: shortName,
                                category: result.category,
                                confidence: result.confidence,
                                reason: result.reason,
                                saved: true, // 클라이언트에 저장 완료 알림
                                brandAnalysis: result.brandAnalysis ? {
                                    brand: result.brandAnalysis.brand,
                                    country: result.brandAnalysis.country,
                                    category: result.brandAnalysis.category,
                                    confidence: result.brandAnalysis.confidence,
                                } : null,
                                visualAnalysis: result.visualAnalysis ? {
                                    fabric: result.visualAnalysis.fabric,
                                    pattern: result.visualAnalysis.pattern,
                                    category: result.visualAnalysis.category,
                                    confidence: result.visualAnalysis.confidence,
                                } : null,
                                elapsed: `${elapsed}초`,
                                avgPerItem: `${avgTime}초/개`,
                                estimatedRemaining: `~${remaining}초`,
                                message: `✓ ${shortName} → ${result.category} (${result.confidence}%) [${elapsed}초, ~${remaining}초 남음]`,
                            });

                            return { productId: product.id, category: result.category, confidence: result.confidence, reason: result.reason };
                        } catch (e: any) {
                            completedCount++;
                            failCount++;

                            try {
                                await db.query(
                                    `INSERT INTO product_overrides (id, internal_category, updated_at)
                                     VALUES ($1, 'ARCHIVE', $2)
                                     ON CONFLICT (id) DO UPDATE
                                     SET internal_category = 'ARCHIVE', updated_at = $2`,
                                    [product.id, new Date()]
                                );
                            } catch { /* DB 오류 무시 */ }

                            send({
                                type: 'error',
                                current: globalIdx + 1,
                                total: processTotal,
                                completed: completedCount,
                                productId: product.id,
                                product: shortName,
                                message: `✗ ${shortName} 실패: ${e.message}`,
                            });

                            return { productId: product.id, category: 'ARCHIVE', confidence: 0, reason: `실패: ${e.message}` };
                        }
                    })
                );

                results.push(...batchResults);

                // 배치 간 딜레이
                if (i + CONCURRENCY < processTotal) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY));
                }
            }

            // 서버 캐시 무효화
            try {
                const baseUrl = process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : 'http://localhost:3000';
                await fetch(`${baseUrl}/api/smartstore/products?invalidateCache=true`);
            } catch { /* 무시 */ }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

            send({
                type: 'complete',
                total,
                toProcess: processTotal,
                skipped: skippedCount,
                success: successCount,
                failed: failCount,
                totalTime: `${totalTime}초`,
                avgPerItem: processTotal > 0 ? `${(parseFloat(totalTime) / processTotal).toFixed(1)}초/개` : '-',
                results,
                message: skippedCount > 0
                    ? `완료! ${successCount}개 분류, ${skippedCount}개 스킵, ${failCount}개 실패 (${totalTime}초)`
                    : `완료! ${successCount}개 성공, ${failCount}개 실패 (총 ${totalTime}초)`,
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
