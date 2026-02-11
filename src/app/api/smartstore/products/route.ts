
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
            internalCategory: override.internal_category || archiveInfo?.category || 'UNCATEGORIZED'
        };
    }).filter(p => p !== null);
}

async function fetchOverrideMap(ids: string[]) {
    if (ids.length === 0) return {};
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    try {
        const { rows: overrides } = await db.query(
            `SELECT * FROM product_overrides WHERE id IN (${placeholders})`,
            ids
        );
        return overrides.reduce((acc: any, row: any) => {
            acc[row.id] = row;
            return acc;
        }, {});
    } catch (dbError) {
        console.warn('[API/Products] DB Query failed, continuing without overrides:', dbError);
        return {};
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const refresh = searchParams.get('refresh') === 'true';
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
            // Fetch ALL products by paginating through all pages
            console.log('[API/Products] Fetching ALL products...');

            // First request to get total count
            const firstPage = await searchProducts(tokenData.access_token, 1, 100, {
                searchKeyword: name || undefined,
                searchType: name ? 'PRODUCT_NAME' : undefined
            });

            const totalElements = firstPage.totalElements || 0;
            const totalPages = Math.ceil(totalElements / 100);
            console.log(`[API/Products] Total: ${totalElements} products, ${totalPages} pages`);

            let allContents = [...(firstPage.contents || [])];

            // Fetch remaining pages in parallel
            if (totalPages > 1) {
                const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
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

            console.log(`[API/Products] Fetched ${allContents.length} total products`);

            // Get overrides for all products
            const ids = allContents.map(p => p.originProductNo.toString()).filter(id => !!id);
            const overrideMap = await fetchOverrideMap(ids);

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

            return handleSuccess({
                contents: filtered,
                totalCount: totalElements,
                page: 1,
                size: totalElements,
                hasMore: false,
                cached: false
            });

        } else {
            // Original single-page fetch logic
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
