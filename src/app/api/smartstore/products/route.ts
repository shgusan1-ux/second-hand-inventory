
import { NextResponse } from 'next/server';
import { getNaverToken, searchProducts } from '@/lib/naver/client';
import { calculateLifecycle } from '@/lib/classification/lifecycle';
import { classifyArchive } from '@/lib/classification/archive';
import { db } from '@/lib/db';
import { handleApiError, handleAuthError, handleSuccess } from '@/lib/api-utils';
import { ensureDbInitialized } from '@/lib/db-init';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = Math.min(parseInt(searchParams.get('size') || '20'), 100);
    const name = searchParams.get('name') || '';
    const stage = searchParams.get('stage') || 'ALL';
    const subStage = searchParams.get('subStage') || 'ALL';

    try {
        console.log(`[API/Products] Request received - Page: ${page}, Stage: ${stage}`);

        // DB 초기화
        await ensureDbInitialized();

        console.log('Authenticating with Naver...');

        let tokenData;
        try {
            tokenData = await getNaverToken();
            console.log('Token acquired successfully');
        } catch (authError: any) {
            console.log(`Auth Failed: ${authError.message}`);

            // Development fallback: Return empty data instead of failing
            if (process.env.NODE_ENV === 'development') {
                console.log('[DEV MODE] Proxy unavailable, returning empty data');
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

        console.log(`Fetching products from Proxy (Term: ${name})...`);
        const naverRes = await searchProducts(tokenData.access_token, page, size, {
            searchKeyword: name || undefined,
            searchType: name ? 'PRODUCT_NAME' : undefined
        });
        console.log(`Proxy returned ${naverRes?.contents?.length || 0} items`);

        if (!naverRes || !naverRes.contents || naverRes.contents.length === 0) {
            console.log('[API/Products] No products found.');
            return handleSuccess({
                contents: [],
                totalCount: naverRes?.totalCount || 0,
                page,
                size,
                hasMore: false
            });
        }

        console.log(`[API/Products] Found ${naverRes.contents.length} products. Merging with DB...`);

        // Fetch DB overrides for these IDs (Compatible with both Postgres and SQLite)
        const ids = naverRes.contents.map(p => p.originProductNo.toString()).filter(id => !!id);
        let overrideMap: any = {};

        if (ids.length > 0) {
            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            try {
                const { rows: overrides } = await db.query(
                    `SELECT * FROM product_overrides WHERE id IN (${placeholders})`,
                    ids
                );
                overrideMap = overrides.reduce((acc: any, row: any) => {
                    acc[row.id] = row;
                    return acc;
                }, {});
            } catch (dbError) {
                console.warn('[API/Products] DB Query failed, continuing without overrides:', dbError);
            }
        }

        const processed = naverRes.contents.map(p => {
            const cp = p.channelProducts?.[0];
            if (!cp) return null;

            const prodId = p.originProductNo?.toString();
            const override = overrideMap[prodId] || {};

            // Defensive defaults for classification
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

        console.log(`[API/Products] Processing complete. Filtered: ${processed.length}`);

        // Backend side filtering for stages if requested
        let filtered = processed;
        if (stage !== 'ALL') {
            filtered = filtered.filter((p: any) => p.lifecycle.stage === stage);
        }
        if (subStage !== 'ALL') {
            filtered = filtered.filter((p: any) => p.archiveInfo?.category === subStage);
        }

        return handleSuccess({
            contents: filtered,
            totalCount: naverRes.totalCount,
            page: naverRes.page,
            size: naverRes.size,
            hasMore: naverRes.totalCount > (page * size)
        });

    } catch (error: any) {
        return handleApiError(error, 'Products API');
    }
}
