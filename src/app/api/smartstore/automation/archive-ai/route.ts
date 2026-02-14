/**
 * AI Archive Classification API v3.0 (SSE Streaming)
 * Gemini 3 Pro — 통합 1콜 + 3개 병렬 처리
 * 7개 ARCHIVE: MILITARY, WORKWEAR, OUTDOOR, JAPANESE, HERITAGE EUROPE, BRITISH, UNISEX
 */

import { classifyForArchive, type ArchiveAIResult } from '@/lib/ai-archive-engine';
import { db } from '@/lib/db';

export const maxDuration = 300; // 5분

const CONCURRENCY = 3;
const BATCH_DELAY = 1000;

export async function POST(request: Request) {
    const { products } = await request.json();

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

            send({
                type: 'start',
                total,
                concurrency: CONCURRENCY,
                message: `${total}개 상품 AI 분류 시작 (${CONCURRENCY}개씩 병렬 처리)`,
            });

            const results: { productId: string; category: string; confidence: number; reason: string }[] = [];
            let successCount = 0;
            let failCount = 0;
            let completedCount = 0;

            // 배치 단위 병렬 처리
            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = products.slice(i, i + CONCURRENCY);
                const batchNum = Math.floor(i / CONCURRENCY) + 1;
                const totalBatches = Math.ceil(total / CONCURRENCY);

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
                            total,
                            product: shortName,
                            phase: 'analyzing',
                            message: `[${globalIdx + 1}/${total}] ${shortName}... Gemini 3 Pro 분석 중`,
                        });

                        try {
                            const result: ArchiveAIResult = await classifyForArchive({
                                id: product.id,
                                name: product.name,
                                imageUrl: product.imageUrl,
                            });

                            // DB 저장
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
                            const remaining = completedCount > 0 ? (((total - completedCount) * (Date.now() - startTime) / completedCount) / 1000).toFixed(0) : '?';

                            send({
                                type: 'result',
                                current: globalIdx + 1,
                                total,
                                completed: completedCount,
                                productId: product.id,
                                product: shortName,
                                category: result.category,
                                confidence: result.confidence,
                                reason: result.reason,
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
                                message: `✓ ${shortName} → ${result.category} (${result.confidence}%) [${elapsed}초 경과, ~${remaining}초 남음]`,
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
                                total,
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
                if (i + CONCURRENCY < total) {
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
                success: successCount,
                failed: failCount,
                totalTime: `${totalTime}초`,
                avgPerItem: total > 0 ? `${(parseFloat(totalTime) / total).toFixed(1)}초/개` : '-',
                results,
                message: `완료! ${successCount}개 성공, ${failCount}개 실패 (총 ${totalTime}초, 평균 ${total > 0 ? (parseFloat(totalTime) / total).toFixed(1) : '-'}초/개)`,
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
