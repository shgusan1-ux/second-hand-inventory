/**
 * 네이버 전시카테고리 & 태그 스캔 API (SSE Streaming, 병렬 최적화)
 *
 * 각 상품의 네이버 상세 정보를 조회하여 실제 전시카테고리와 태그를 읽어옴
 *
 * POST /api/smartstore/exhibition/scan
 * Body: { productNos?: string[], forceRescan?: boolean }
 *
 * GET /api/smartstore/exhibition/scan
 * → DB에 저장된 스캔 결과 조회 (seller_tags 포함)
 */
import { getNaverToken, getProductDetail } from '@/lib/naver/client';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

export const maxDuration = 300;

const CONCURRENCY = 5;
const BATCH_DELAY = 100;

// 네이버 전시카테고리 ID → 내부 카테고리명 역방향 매핑
const REVERSE_DISPLAY_MAP: Record<string, string> = {};

function buildReverseMap() {
    if (Object.keys(REVERSE_DISPLAY_MAP).length > 0) return;
    const envMap: Record<string, string> = {
        'SMARTSTORE_NEW_ID': 'NEW',
        'SMARTSTORE_CURATED_ID': 'CURATED',
        'SMARTSTORE_ARCHIVE_MILITARY_ID': 'MILITARY ARCHIVE',
        'SMARTSTORE_ARCHIVE_WORKWEAR_ID': 'WORKWEAR ARCHIVE',
        'SMARTSTORE_ARCHIVE_OUTDOOR_ID': 'OUTDOOR ARCHIVE',
        'SMARTSTORE_ARCHIVE_JAPAN_ID': 'JAPANESE ARCHIVE',
        'SMARTSTORE_ARCHIVE_EUROPE_ID': 'HERITAGE EUROPE',
        'SMARTSTORE_ARCHIVE_BRITISH_ID': 'BRITISH ARCHIVE',
        'SMARTSTORE_ARCHIVE_UNISEX_ID': 'UNISEX ARCHIVE',
        'SMARTSTORE_ARCHIVE_ROOT_ID': 'ARCHIVE',
        'SMARTSTORE_CLEARANCE_ID': 'CLEARANCE',
    };
    for (const [envKey, categoryName] of Object.entries(envMap)) {
        const id = (process.env[envKey] || '').trim();
        if (id) REVERSE_DISPLAY_MAP[id] = categoryName;
    }
}

buildReverseMap();

function resolveDisplayCategory(displayCategoryIds: string[]): string {
    if (!displayCategoryIds || displayCategoryIds.length === 0) return '';
    for (const id of displayCategoryIds) {
        const mapped = REVERSE_DISPLAY_MAP[String(id).trim()];
        if (mapped && mapped !== 'ARCHIVE') return mapped;
    }
    for (const id of displayCategoryIds) {
        const mapped = REVERSE_DISPLAY_MAP[String(id).trim()];
        if (mapped) return mapped;
    }
    return 'UNKNOWN';
}

// GET: 스캔 결과 조회
export async function GET() {
    try {
        await ensureDbInitialized();
        const { rows } = await db.query(`
            SELECT origin_product_no, naver_display_category, display_category_ids, display_scanned_at, name, seller_tags
            FROM naver_product_map WHERE display_scanned_at IS NOT NULL
            ORDER BY display_scanned_at DESC
        `);

        const counts: Record<string, number> = {};
        for (const row of rows) {
            const cat = row.naver_display_category || 'NONE';
            counts[cat] = (counts[cat] || 0) + 1;
        }

        return new Response(JSON.stringify({
            counts,
            totalScanned: rows.length,
            lastScan: rows[0]?.display_scanned_at || null,
            products: rows,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

// POST: 전시카테고리 및 태그 스캔 (병렬 SSE)
export async function POST(request: Request) {
    await ensureDbInitialized();

    try { await db.query(`ALTER TABLE naver_product_map ADD COLUMN seller_tags TEXT`); } catch { }

    const body = await request.json().catch(() => ({}));
    let productNos: string[] = body.productNos || [];
    const forceRescan = body.forceRescan === true;

    if (productNos.length === 0) {
        try {
            const { rows } = await db.query(
                `SELECT origin_product_no FROM naver_products WHERE status_type IN ('SALE', 'OUTOFSTOCK', 'SUSPENSION') ORDER BY origin_product_no`
            );
            productNos = rows.map((r: any) => String(r.origin_product_no));
        } catch {
            const { rows } = await db.query(`SELECT origin_product_no FROM naver_product_map ORDER BY origin_product_no`);
            productNos = rows.map((r: any) => String(r.origin_product_no));
        }
    }

    if (productNos.length === 0) {
        return new Response(JSON.stringify({ error: '스캔할 상품이 없습니다.' }), { status: 400 });
    }

    let skippedCount = 0;
    if (!forceRescan && productNos.length > 0) {
        try {
            const { rows } = await db.query(
                `SELECT origin_product_no FROM naver_product_map
                 WHERE display_scanned_at IS NOT NULL
                 AND display_scanned_at > datetime('now', '-24 hours')`
            );
            const scannedSet = new Set(rows.map((r: any) => String(r.origin_product_no)));
            const before = productNos.length;
            productNos = productNos.filter(no => !scannedSet.has(no));
            skippedCount = before - productNos.length;
        } catch { }
    }

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => { try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { } };

            const total = productNos.length;
            const startTime = Date.now();
            const now = new Date().toISOString();

            send({
                type: 'start',
                total,
                skipped: skippedCount,
                message: skippedCount > 0
                    ? `${total}개 스캔 시작 (${skippedCount}개 생략)`
                    : `${total}개 스캔 시작`,
            });

            if (total === 0) {
                send({ type: 'complete', total: 0, success: 0, failed: 0, skipped: skippedCount, counts: {}, totalTime: '0초', message: '스캔 완료 (대상 없음)' });
                controller.close();
                return;
            }

            buildReverseMap();
            let token: string;
            try {
                const tokenData = await getNaverToken();
                token = tokenData.access_token;
            } catch (e: any) {
                send({ type: 'error', message: '토큰 발급 실패: ' + e.message });
                controller.close();
                return;
            }

            const counts: Record<string, number> = {};
            let successCount = 0;
            let failCount = 0;
            const dbBuffer: any[] = [];

            const flushDB = async () => {
                if (dbBuffer.length === 0) return;
                const batch = dbBuffer.splice(0, dbBuffer.length);
                for (const item of batch) {
                    try {
                        await db.query(`
                            INSERT INTO naver_product_map (origin_product_no, name, naver_display_category, display_category_ids, display_scanned_at, seller_tags)
                            VALUES ($1, $2, $3, $4, $5, $6)
                            ON CONFLICT (origin_product_no) DO UPDATE SET
                                naver_display_category = EXCLUDED.naver_display_category,
                                display_category_ids = EXCLUDED.display_category_ids,
                                display_scanned_at = EXCLUDED.display_scanned_at,
                                name = COALESCE(EXCLUDED.name, naver_product_map.name),
                                seller_tags = EXCLUDED.seller_tags
                        `, [item.productNo, item.name, item.category, item.ids, now, item.tags]);
                    } catch { }
                }
            };

            for (let i = 0; i < total; i += CONCURRENCY) {
                const batch = productNos.slice(i, i + CONCURRENCY);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                const results = await Promise.allSettled(
                    batch.map(async (productNo) => {
                        const detail = await getProductDetail(token, Number(productNo));
                        const channelProduct = detail.smartstoreChannelProduct || {};
                        let displayCategoryIds: string[] = channelProduct.channelProductDisplayCategoryNoList || [];
                        const productName = (detail.originProduct?.name || '').substring(0, 100);
                        const channelProductNo = channelProduct?.channelProductNo;

                        // Extract tags
                        const seoTags = detail.originProduct?.detailAttribute?.seoInfo?.sellerTags || [];
                        const sellerTags = seoTags.map((t: any) => t.text).join(',');

                        if (displayCategoryIds.length === 0 && channelProductNo) {
                            // Fallback logic if needed (skip for brevity or reuse existing)
                        }

                        let displayCategory = resolveDisplayCategory(displayCategoryIds);
                        // Fallback to local logs if unknown
                        if ((!displayCategory || displayCategory === 'UNKNOWN' || displayCategory === 'NONE') && displayCategoryIds.length === 0) {
                            try {
                                const { rows: logs } = await db.query(
                                    `SELECT target_category FROM exhibition_sync_logs 
                                     WHERE product_no = $1 AND status = 'SUCCESS' 
                                     ORDER BY created_at DESC LIMIT 1`,
                                    [productNo]
                                );
                                if (logs.length > 0) displayCategory = logs[0].target_category;
                            } catch { }
                        }

                        return { productNo, productName, displayCategory, displayCategoryIds, sellerTags };
                    })
                );

                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        const { productNo, productName, displayCategory, displayCategoryIds, sellerTags } = result.value;
                        const cat = displayCategory || 'NONE';
                        counts[cat] = (counts[cat] || 0) + 1;
                        successCount++;
                        dbBuffer.push({
                            productNo, name: productName, category: displayCategory || null,
                            ids: JSON.stringify(displayCategoryIds), tags: sellerTags || null
                        });
                    } else {
                        failCount++;
                    }
                }

                await flushDB();
                const processed = Math.min(i + CONCURRENCY, total);
                send({
                    type: 'progress',
                    current: processed,
                    total,
                    elapsed: `${elapsed}초`,
                    counts: { ...counts },
                    message: `[${processed}/${total}] 스캔 중...`,
                });

                if (i + CONCURRENCY < total) await new Promise(r => setTimeout(r, BATCH_DELAY));
            }

            await flushDB();
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            send({
                type: 'complete',
                total,
                success: successCount,
                failed: failCount,
                skipped: skippedCount,
                counts,
                totalTime,
                message: '스캔 완료'
            });

            controller.close();
        },
    });

    return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}
