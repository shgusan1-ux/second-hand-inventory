/**
 * ARCHIVE 서브카테고리 상품 일괄 재분류 API (SSE Streaming)
 *
 * DB에서 ARCHIVE 서브카테고리(MILITARY/WORKWEAR/OUTDOOR/JAPANESE/HERITAGE EUROPE/BRITISH/UNISEX)
 * 상품을 조회하여 AI로 재분류합니다.
 *
 * POST /api/smartstore/automation/reclassify-archive
 * Body: { offset?: number, limit?: number }  (기본: offset=0, limit=100)
 *
 * Vercel 5분 제한 → limit=100씩 여러 번 호출
 */
import { classifyForArchive, type ArchiveAIResult } from '@/lib/ai-archive-engine';
import { getNaverToken, getProductDetail } from '@/lib/naver/client';
import { db } from '@/lib/db';

export const maxDuration = 300; // 5분

const ARCHIVE_SUB_CATEGORIES = [
    'MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE',
    'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE',
];

const CONCURRENCY = 3;
const BATCH_DELAY = 1000;

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}));
    const offset = Number(body.offset) || 0;
    const limit = Math.min(Number(body.limit) || 100, 100); // 최대 100

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch { /* stream closed */ }
            };

            // 1. DB에서 ARCHIVE 서브카테고리 상품 조회
            let productIds: string[] = [];
            let totalInDb = 0;
            try {
                // 전체 수 조회
                const countResult = await db.query(
                    `SELECT COUNT(*) as cnt FROM product_overrides WHERE internal_category IN (${ARCHIVE_SUB_CATEGORIES.map((_, i) => `$${i + 1}`).join(',')})`,
                    ARCHIVE_SUB_CATEGORIES
                );
                totalInDb = Number(countResult.rows[0]?.cnt || 0);

                // offset/limit으로 조회
                const result = await db.query(
                    `SELECT id, internal_category FROM product_overrides
                     WHERE internal_category IN (${ARCHIVE_SUB_CATEGORIES.map((_, i) => `$${i + 1}`).join(',')})
                     ORDER BY id
                     LIMIT $${ARCHIVE_SUB_CATEGORIES.length + 1} OFFSET $${ARCHIVE_SUB_CATEGORIES.length + 2}`,
                    [...ARCHIVE_SUB_CATEGORIES, limit, offset]
                );
                productIds = result.rows.map((r: any) => r.id);
            } catch (e: any) {
                send({ type: 'error', message: 'DB 조회 실패: ' + e.message });
                controller.close();
                return;
            }

            const total = productIds.length;
            send({
                type: 'start',
                total,
                totalInDb,
                offset,
                limit,
                message: `전체 ${totalInDb}개 중 ${offset + 1}~${offset + total}번째 상품 재분류 시작`,
            });

            if (total === 0) {
                send({ type: 'complete', total: 0, success: 0, failed: 0, message: '재분류할 상품이 없습니다' });
                controller.close();
                return;
            }

            // 2. 네이버 토큰 발급
            let token: string;
            try {
                const tokenData = await getNaverToken();
                token = tokenData.access_token;
            } catch (e: any) {
                send({ type: 'error', message: '네이버 토큰 발급 실패: ' + e.message });
                controller.close();
                return;
            }

            const startTime = Date.now();
            let successCount = 0;
            let failCount = 0;
            let completedCount = 0;

            // 3. 배치 단위 병렬 처리
            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = productIds.slice(i, i + CONCURRENCY);

                const batchResults = await Promise.all(
                    batch.map(async (productId, batchIdx) => {
                        const globalIdx = i + batchIdx;
                        try {
                            // 네이버 상세 조회
                            const detail = await getProductDetail(token, Number(productId));
                            const productName = detail.originProduct?.name || '';
                            const shortName = productName.substring(0, 30);
                            const imageUrl = detail.originProduct?.images?.representativeImage?.url || '';

                            send({
                                type: 'progress',
                                current: offset + globalIdx + 1,
                                total: totalInDb,
                                product: shortName,
                                message: `[${offset + globalIdx + 1}/${totalInDb}] ${shortName}... AI 분석 중`,
                            });

                            // AI 분류
                            const result: ArchiveAIResult = await classifyForArchive({
                                id: productId,
                                name: productName,
                                imageUrl: imageUrl || undefined,
                            });

                            // DB 업데이트
                            await db.query(
                                `UPDATE product_overrides SET internal_category = $1, updated_at = $2 WHERE id = $3`,
                                [result.category, new Date(), productId]
                            );

                            completedCount++;
                            successCount++;

                            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                            const remaining = completedCount > 0 ? (((total - completedCount) * (Date.now() - startTime) / completedCount) / 1000).toFixed(0) : '?';

                            send({
                                type: 'result',
                                current: offset + globalIdx + 1,
                                productId,
                                product: shortName,
                                category: result.category,
                                confidence: result.confidence,
                                reason: result.reason,
                                elapsed: `${elapsed}초`,
                                estimatedRemaining: `~${remaining}초`,
                                message: `✓ ${shortName} → ${result.category} (${result.confidence}%)`,
                            });

                            return true;
                        } catch (e: any) {
                            completedCount++;
                            failCount++;
                            send({
                                type: 'error',
                                productId,
                                message: `✗ ${productId} 실패: ${e.message}`,
                            });
                            return false;
                        }
                    })
                );

                // 배치 간 딜레이
                if (i + CONCURRENCY < total) {
                    await new Promise(r => setTimeout(r, BATCH_DELAY));
                }
            }

            // 캐시 무효화
            try {
                const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
                await fetch(`${baseUrl}/api/smartstore/products?invalidateCache=true`);
            } catch { /* 무시 */ }

            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            send({
                type: 'complete',
                total,
                totalInDb,
                offset,
                success: successCount,
                failed: failCount,
                totalTime: `${totalTime}초`,
                nextOffset: offset + total < totalInDb ? offset + total : null,
                message: `완료! ${successCount}개 성공, ${failCount}개 실패 (${totalTime}초). ${offset + total < totalInDb ? `다음: offset=${offset + total}` : '전부 완료!'}`,
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

// GET: 현재 ARCHIVE 서브카테고리별 상품 수 확인
export async function GET() {
    try {
        const result = await db.query(
            `SELECT internal_category, COUNT(*) as cnt
             FROM product_overrides
             WHERE internal_category IN (${ARCHIVE_SUB_CATEGORIES.map((_, i) => `$${i + 1}`).join(',')})
             GROUP BY internal_category
             ORDER BY cnt DESC`,
            ARCHIVE_SUB_CATEGORIES
        );

        const totalResult = await db.query(
            `SELECT COUNT(*) as cnt FROM product_overrides WHERE internal_category IN (${ARCHIVE_SUB_CATEGORIES.map((_, i) => `$${i + 1}`).join(',')})`,
            ARCHIVE_SUB_CATEGORIES
        );

        return Response.json({
            total: Number(totalResult.rows[0]?.cnt || 0),
            categories: result.rows,
        });
    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
