/**
 * AI Archive Classification API (SSE Streaming)
 * 3-Phase: Brand Intelligence → Visual Intelligence → Fusion Decision
 */

import { classifyForArchive, type ArchiveAIResult } from '@/lib/ai-archive-engine';
import { db } from '@/lib/db';

export const maxDuration = 300; // 5분 (대량 처리)

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

            send({ type: 'start', total: products.length });

            const results: { productId: string; category: string; confidence: number; reason: string }[] = [];
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < products.length; i++) {
                const product = products[i];
                const shortName = (product.name || '').substring(0, 35);

                try {
                    // Phase 1: Brand Intelligence
                    send({
                        type: 'progress',
                        current: i + 1,
                        total: products.length,
                        product: shortName,
                        phase: 'brand',
                        message: `[${i + 1}/${products.length}] ${shortName}... 브랜드 분석 중`,
                    });

                    const result: ArchiveAIResult = await classifyForArchive({
                        id: product.id,
                        name: product.name,
                        imageUrl: product.imageUrl,
                    });

                    // DB 저장: product_overrides.internal_category
                    const now = new Date();
                    await db.query(
                        `INSERT INTO product_overrides (id, internal_category, updated_at)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (id) DO UPDATE
                         SET internal_category = $2, updated_at = $3`,
                        [product.id, result.category, now]
                    );

                    successCount++;
                    results.push({
                        productId: product.id,
                        category: result.category,
                        confidence: result.confidence,
                        reason: result.reason,
                    });

                    send({
                        type: 'result',
                        current: i + 1,
                        total: products.length,
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
                    });
                } catch (e: any) {
                    failCount++;
                    console.error(`[Archive-AI] 분류 실패 ${product.id}:`, e.message);

                    // 실패 시 ARCHIVE(미분류)로 저장
                    try {
                        await db.query(
                            `INSERT INTO product_overrides (id, internal_category, updated_at)
                             VALUES ($1, 'ARCHIVE', $2)
                             ON CONFLICT (id) DO UPDATE
                             SET internal_category = 'ARCHIVE', updated_at = $2`,
                            [product.id, new Date()]
                        );
                    } catch { /* DB 오류 무시 */ }

                    results.push({
                        productId: product.id,
                        category: 'ARCHIVE',
                        confidence: 0,
                        reason: `분류 실패: ${e.message}`,
                    });

                    send({
                        type: 'error',
                        current: i + 1,
                        total: products.length,
                        productId: product.id,
                        product: shortName,
                        message: e.message,
                    });
                }

                // Rate limiting (마지막 상품 제외)
                if (i < products.length - 1) {
                    await new Promise(r => setTimeout(r, 2000));
                }
            }

            // 서버 캐시 무효화 (product route의 productCache)
            try {
                const baseUrl = process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : 'http://localhost:3000';
                await fetch(`${baseUrl}/api/smartstore/products?invalidateCache=true`);
            } catch { /* 무시 */ }

            send({
                type: 'complete',
                total: products.length,
                success: successCount,
                failed: failCount,
                results,
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
