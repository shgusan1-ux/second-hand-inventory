
import { NextResponse } from 'next/server';
import { getNaverToken, searchProducts } from '@/lib/naver/client';
import { calculateLifecycle } from '@/lib/classification/lifecycle';
import { classifyArchive } from '@/lib/classification/archive';
import { db } from '@/lib/db';
import { handleApiError, handleAuthError, handleSuccess } from '@/lib/api-utils';
import { ensureDbInitialized } from '@/lib/db-init';

// Server-side cache for all products (survives across requests in same serverless instance)
let productCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function processProducts(contents: any[], overrideMap: any) {
    return contents.map(p => {
        const cp = p.channelProducts?.[0];
        if (!cp) return null;

        const prodId = p.originProductNo?.toString();
        const override = overrideMap[prodId] || {};

        const regDate = cp.regDate || new Date().toISOString();
        const prodName = cp.name || 'Unknown Product';

        const lifecycle = calculateLifecycle(regDate, override.override_date);
        const archiveInfo = lifecycle.stage === 'ARCHIVE'
            ? classifyArchive(prodName, [])
            : null;

        return {
            ...cp,
            originProductNo: prodId,
            images: cp.images,
            lifecycle,
            archiveInfo,
            internalCategory: override.internal_category || archiveInfo?.category || 'UNCATEGORIZED',
            suggestedArchiveId: override.suggested_archive_id,
            suggestionReason: override.suggestion_reason,
            inferredBrand: override.inferred_brand,
            ocrText: override.ocr_text,
            isApproved: override.is_approved
        };
    }).filter(p => p !== null);
}

async function fetchOverrideMap(ids: string[]) {
    if (ids.length === 0) return {};
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    try {
        // 1. Get user overrides
        const { rows: overrides } = await db.query(
            `SELECT * FROM product_overrides WHERE id IN (${placeholders})`,
            ids
        );

        // 2. Get Naver product map enrichment (including AI suggestions)
        const { rows: naverMap } = await db.query(
            `SELECT * FROM naver_product_map WHERE origin_product_no IN (${placeholders})`,
            ids
        );

        const map: any = {};

        // Base mapping from naver_product_map
        naverMap.forEach((row: any) => {
            map[row.origin_product_no] = { ...row };
        });

        // User overrides take precedence for certain fields
        overrides.forEach((row: any) => {
            if (map[row.id]) {
                map[row.id] = { ...map[row.id], ...row };
            } else {
                map[row.id] = row;
            }
        });

        return map;
    } catch (dbError) {
        console.warn('[API/Products] DB Query failed, continuing without overrides:', dbError);
        return {};
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const refresh = searchParams.get('refresh') === 'true';
    const stream = searchParams.get('stream') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const size = Math.min(parseInt(searchParams.get('size') || '20'), 100);
    const name = searchParams.get('name') || '';
    const stage = searchParams.get('stage') || 'ALL';
    const subStage = searchParams.get('subStage') || 'ALL';

    try {
        await ensureDbInitialized();

        // Return cached data if available and not expired (fetchAll only)
        if (fetchAll && !refresh && productCache && (Date.now() - productCache.timestamp) < CACHE_TTL) {
            console.log('[API/Products] Returning cached data');
            let filtered = productCache.data.contents;
            if (stage !== 'ALL') {
                filtered = filtered.filter((p: any) => p.lifecycle?.stage === stage);
            }
            if (subStage !== 'ALL') {
                filtered = filtered.filter((p: any) => p.archiveInfo?.category === subStage);
            }

            if (stream) {
                // For stream requests, send cached data as SSE
                const encoder = new TextEncoder();
                const body = new ReadableStream({
                    start(controller) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', percent: 100, message: '캐시에서 로드' })}\n\n`));
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                            type: 'complete',
                            data: { contents: filtered, totalCount: productCache!.data.totalCount, cached: true, cachedAt: new Date(productCache!.timestamp).toISOString() }
                        })}\n\n`));
                        controller.close();
                    }
                });
                return new Response(body, {
                    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
                });
            }

            return handleSuccess({
                contents: filtered,
                totalCount: productCache.data.totalCount,
                page: 1,
                size: productCache.data.totalCount,
                hasMore: false,
                cached: true,
                cachedAt: new Date(productCache.timestamp).toISOString()
            });
        }

        if (fetchAll && stream) {
            // SSE streaming mode: send progress events as we fetch
            const encoder = new TextEncoder();
            const readable = new ReadableStream({
                async start(controller) {
                    const send = (data: any) => {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                    };

                    try {
                        send({ type: 'progress', percent: 5, message: '인증 중...' });

                        let tokenData;
                        try {
                            tokenData = await getNaverToken();
                        } catch (authError: any) {
                            send({ type: 'error', message: `인증 실패: ${authError.message}` });
                            controller.close();
                            return;
                        }

                        send({ type: 'progress', percent: 10, message: '상품 목록 조회 중...' });

                        // First page to get total count
                        const firstPage = await searchProducts(tokenData.access_token, 0, 100, {
                            searchKeyword: name || undefined,
                            searchType: name ? 'PRODUCT_NAME' : undefined
                        });

                        const totalElements = firstPage.totalElements || 0;
                        const totalPages = Math.ceil(totalElements / 100);

                        send({ type: 'progress', percent: 20, message: `총 ${totalElements}개 상품 발견 (${totalPages} 페이지)` });

                        let allContents = [...(firstPage.contents || [])];

                        // Fetch remaining pages with progress updates
                        if (totalPages > 1) {
                            const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
                            let completedPages = 1;

                            const pageResults = await Promise.all(
                                remainingPages.map(async (p) => {
                                    const result = await searchProducts(tokenData.access_token, p, 100, {
                                        searchKeyword: name || undefined,
                                        searchType: name ? 'PRODUCT_NAME' : undefined
                                    }).catch(err => {
                                        console.error(`[API/Products] Failed to fetch page ${p}:`, err);
                                        return { contents: [] } as any;
                                    });

                                    completedPages++;
                                    const percent = 20 + Math.floor((completedPages / totalPages) * 60);
                                    send({ type: 'progress', percent, message: `${completedPages}/${totalPages} 페이지 완료 (${allContents.length + (result.contents?.length || 0)}개)` });

                                    return result;
                                })
                            );

                            for (const result of pageResults) {
                                if (result.contents) {
                                    allContents = allContents.concat(result.contents);
                                }
                            }
                        }

                        send({ type: 'progress', percent: 85, message: `${allContents.length}개 상품 처리 중...` });

                        // Get overrides
                        const ids = allContents.map(p => p.originProductNo.toString()).filter(id => !!id);
                        const overrideMap = await fetchOverrideMap(ids);

                        send({ type: 'progress', percent: 90, message: '분류 처리 중...' });

                        // Process all products
                        const processed = processProducts(allContents, overrideMap);

                        // Cache the full result
                        productCache = {
                            data: { contents: processed, totalCount: totalElements },
                            timestamp: Date.now()
                        };

                        // Apply stage filters
                        let filtered = processed;
                        if (stage !== 'ALL') {
                            filtered = filtered.filter((p: any) => p.lifecycle?.stage === stage);
                        }
                        if (subStage !== 'ALL') {
                            filtered = filtered.filter((p: any) => p.archiveInfo?.category === subStage);
                        }

                        send({ type: 'progress', percent: 100, message: '완료!' });
                        send({
                            type: 'complete',
                            data: {
                                contents: filtered,
                                totalCount: totalElements,
                                page: 1,
                                size: totalElements,
                                hasMore: false,
                                cached: false
                            }
                        });

                    } catch (error: any) {
                        send({ type: 'error', message: error.message || 'Unknown error' });
                    }

                    controller.close();
                }
            });

            return new Response(readable, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                }
            });
        }

        // Non-streaming fetchAll or regular paginated fetch
        let tokenData;
        try {
            tokenData = await getNaverToken();
        } catch (authError: any) {
            console.log(`Auth Failed: ${authError.message}`);
            if (process.env.NODE_ENV === 'development') {
                return handleSuccess({
                    contents: [],
                    totalCount: 0,
                    page,
                    size,
                    hasMore: false
                });
            }
            return handleAuthError(authError);
        }

        if (fetchAll) {
            console.log('[API/Products] Fetching ALL products...');

            const firstPage = await searchProducts(tokenData.access_token, 0, 100, {
                searchKeyword: name || undefined,
                searchType: name ? 'PRODUCT_NAME' : undefined
            });

            const totalElements = firstPage.totalElements || 0;
            const totalPages = Math.ceil(totalElements / 100);

            let allContents = [...(firstPage.contents || [])];

            if (totalPages > 1) {
                const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 1);
                const pageResults = await Promise.all(
                    remainingPages.map(p =>
                        searchProducts(tokenData.access_token, p, 100, {
                            searchKeyword: name || undefined,
                            searchType: name ? 'PRODUCT_NAME' : undefined
                        }).catch(err => {
                            console.error(`[API/Products] Failed to fetch page ${p}:`, err);
                            return { contents: [] } as any;
                        })
                    )
                );

                for (const result of pageResults) {
                    if (result.contents) {
                        allContents = allContents.concat(result.contents);
                    }
                }
            }

            const ids = allContents.map(p => p.originProductNo.toString()).filter(id => !!id);
            const overrideMap = await fetchOverrideMap(ids);
            const processed = processProducts(allContents, overrideMap);

            productCache = {
                data: { contents: processed, totalCount: totalElements },
                timestamp: Date.now()
            };

            let filtered = processed;
            if (stage !== 'ALL') {
                filtered = filtered.filter((p: any) => p.lifecycle?.stage === stage);
            }
            if (subStage !== 'ALL') {
                filtered = filtered.filter((p: any) => p.archiveInfo?.category === subStage);
            }

            return handleSuccess({
                contents: filtered,
                totalCount: totalElements,
                page: 1,
                size: totalElements,
                hasMore: false,
                cached: false
            });

        } else {
            console.log(`[API/Products] Fetching page ${page}, size ${size}`);
            const naverRes = await searchProducts(tokenData.access_token, page, size, {
                searchKeyword: name || undefined,
                searchType: name ? 'PRODUCT_NAME' : undefined
            });

            if (!naverRes || !naverRes.contents || naverRes.contents.length === 0) {
                return handleSuccess({
                    contents: [],
                    totalCount: naverRes?.totalElements || 0,
                    page,
                    size,
                    hasMore: false
                });
            }

            const ids = naverRes.contents.map(p => p.originProductNo.toString()).filter(id => !!id);
            const overrideMap = await fetchOverrideMap(ids);
            const processed = processProducts(naverRes.contents, overrideMap);

            let filtered = processed;
            if (stage !== 'ALL') {
                filtered = filtered.filter((p: any) => p.lifecycle?.stage === stage);
            }
            if (subStage !== 'ALL') {
                filtered = filtered.filter((p: any) => p.archiveInfo?.category === subStage);
            }

            return handleSuccess({
                contents: filtered,
                totalCount: naverRes.totalElements,
                page: naverRes.page,
                size: naverRes.size,
                hasMore: naverRes.totalElements > (page * size)
            });
        }

    } catch (error: any) {
        return handleApiError(error, 'Products API');
    }
}
