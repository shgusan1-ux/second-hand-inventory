
import { NextResponse } from 'next/server';
import { getNaverToken, searchProducts } from '@/lib/naver/client';
import { calculateLifecycle } from '@/lib/classification/lifecycle';
import { classifyArchive } from '@/lib/classification/archive';
import { classifyProduct, logClassification } from '@/lib/classification';
import { mergeClassifications } from '@/lib/classification/merger';
import { db } from '@/lib/db';
import { handleApiError, handleAuthError, handleSuccess } from '@/lib/api-utils';
import { ensureDbInitialized } from '@/lib/db-init';

// Server-side cache for all products (survives across requests in same serverless instance)
let productCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// 네이버 스마트스토어 기준: 판매중 1007 + 품절 1 + 판매중지 9 = 1017
const PRODUCT_STATUS_FILTER = ['SALE', 'OUTOFSTOCK', 'SUSPENSION'];

function buildSearchFilters(name: string) {
    return {
        searchKeyword: name || undefined,
        searchType: name ? 'PRODUCT_NAME' : undefined,
        productStatusTypes: PRODUCT_STATUS_FILTER,
    };
}

// originProductNo 기준 중복 제거
function deduplicateContents(contents: any[]): any[] {
    const seen = new Set<string>();
    return contents.filter(p => {
        const id = p.originProductNo?.toString();
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });
}

// 상태별 카운트 계산 (네이버 대시보드 8개 항목)
function calculateStatusCounts(contents: any[]) {
    const counts = {
        total: contents.length,
        wait: 0,      // 판매대기
        sale: 0,      // 판매중
        outofstock: 0, // 품절
        unapproved: 0, // 승인대기
        suspension: 0,  // 판매중지
        ended: 0,      // 판매종료
        prohibited: 0,  // 판매금지
    };
    for (const p of contents) {
        const status = p.statusType;
        switch (status) {
            case 'SALE': counts.sale++; break;
            case 'OUTOFSTOCK': counts.outofstock++; break;
            case 'SUSPENSION': counts.suspension++; break;
            case 'WAIT': counts.wait++; break;
            case 'DELETE': counts.ended++; break;
            default: break;
        }
    }
    return counts;
}

function processProducts(contents: any[], overrideMap: any) {
    return contents.map(p => {
        const cp = p.channelProducts?.[0];
        if (!cp) return null;

        const prodId = p.originProductNo?.toString();
        const override = overrideMap[prodId] || {};

        // 라이프사이클 기준일: override_date > first_seen_at > regDate > 오늘
        const baseDate = override.override_date || override.first_seen_at || cp.regDate || new Date().toISOString();
        const prodName = override.product_name || cp.name || 'Unknown Product';

        const lifecycle = calculateLifecycle(baseDate);
        const archiveInfo = lifecycle.stage === 'ARCHIVE'
            ? classifyArchive(prodName, [])
            : null;

        // 다차원 자동 분류 (텍스트 기반)
        const textClassification = classifyProduct(prodName);
        logClassification(prodId, prodName, textClassification);

        // Vision 결과와 merge (DB에 결과가 있는 경우)
        const visionData = override.visionAnalysis;
        let classification: any = textClassification;

        if (visionData?.analysis_status === 'completed') {
            // 수동 브랜드 매칭
            const customBrands = override.customBrands || [];
            const brandName = (visionData.vision_brand || textClassification.brand || '').toUpperCase();
            const customBrand = customBrands.find((b: any) =>
                b.brand_name === brandName ||
                (b.aliases && JSON.parse(b.aliases).some((a: string) => a.toUpperCase() === brandName))
            ) || null;

            const visionResult = {
                brand: visionData.vision_brand || '',
                clothingType: visionData.vision_clothing_type || '기타',
                clothingSubType: visionData.vision_clothing_sub_type || '',
                gender: visionData.vision_gender || 'UNKNOWN',
                grade: visionData.vision_grade || 'A급',
                gradeReason: visionData.vision_grade_reason || '',
                colors: visionData.vision_color ? JSON.parse(visionData.vision_color) : [],
                pattern: visionData.vision_pattern || '',
                fabric: visionData.vision_fabric || '',
                size: visionData.vision_size || '',
                confidence: visionData.vision_confidence || 0,
            };

            classification = mergeClassifications(textClassification, visionResult, customBrand);
            classification.visionStatus = 'completed';
            classification.visionGrade = visionData.vision_grade || 'A급';
            classification.visionColors = visionData.vision_color ? JSON.parse(visionData.vision_color) : [];
        } else {
            // Vision 미완료: 수동 브랜드만 체크
            const customBrands = override.customBrands || [];
            const brandName = (textClassification.brand || '').toUpperCase();
            const customBrand = customBrands.find((b: any) =>
                b.brand_name === brandName ||
                (b.aliases && JSON.parse(b.aliases).some((a: string) => a.toUpperCase() === brandName))
            ) || null;

            if (customBrand) {
                classification = {
                    ...textClassification,
                    brand: customBrand.brand_name,
                    brandTier: customBrand.tier,
                    confidence: Math.min(100, textClassification.confidence + 10),
                };
            }

            classification.visionStatus = visionData?.analysis_status || 'none';
        }

        // 라이프사이클 기반 내부카테고리 결정
        // NEW(0-30일) → "NEW", CURATED(30-60일) → "CURATED"
        // ARCHIVE(60-120일) → 브랜드 tier ARCHIVE (예: "MILITARY ARCHIVE")
        // CLEARANCE(120일+) → "CLEARANCE"
        let internalCategory: string;
        const savedArchiveTier = override.internal_category; // DB에 수동 확정된 값

        switch (lifecycle.stage) {
            case 'NEW':
                internalCategory = 'NEW';
                break;
            case 'CURATED':
                internalCategory = 'CURATED';
                break;
            case 'ARCHIVE': {
                // 수동 확정값 우선, 없으면 AI 분류 tier, 없으면 텍스트 분류
                if (savedArchiveTier && savedArchiveTier.includes('ARCHIVE')) {
                    internalCategory = savedArchiveTier;
                } else if (classification.brandTier && classification.brandTier !== 'OTHER') {
                    internalCategory = classification.brandTier + ' ARCHIVE';
                } else if (archiveInfo?.category && archiveInfo.category !== 'UNCATEGORIZED') {
                    internalCategory = archiveInfo.category + ' ARCHIVE';
                } else {
                    internalCategory = 'ARCHIVE';
                }
                break;
            }
            case 'CLEARANCE':
                internalCategory = 'CLEARANCE';
                break;
            default:
                internalCategory = 'NEW';
        }

        return {
            ...cp,
            originProductNo: prodId,
            sellerManagementCode: p.sellerManagementCode || '',
            thumbnailUrl: cp.representativeImage?.url || null,
            lifecycle,
            archiveInfo,
            internalCategory,
            archiveTier: savedArchiveTier, // 수동 확정된 아카이브 tier (lifecycle 무관하게 보존)
            classification,
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

        // 3. Vision 분석 결과 조회
        let visionMap: any = {};
        try {
            const { rows: visionRows } = await db.query(
                `SELECT origin_product_no, vision_brand, vision_clothing_type, vision_clothing_sub_type,
                        vision_gender, vision_grade, vision_grade_reason, vision_color, vision_pattern,
                        vision_fabric, vision_size, vision_confidence, merged_confidence, analysis_status
                 FROM product_vision_analysis WHERE origin_product_no IN (${placeholders})`,
                ids
            );
            visionRows.forEach((row: any) => { visionMap[row.origin_product_no] = row; });
        } catch { /* 테이블 아직 없으면 무시 */ }

        // 4. 수동 브랜드 조회
        let customBrands: any[] = [];
        try {
            const { rows } = await db.query('SELECT brand_name, brand_name_ko, tier, aliases FROM custom_brands WHERE is_active = TRUE');
            customBrands = rows;
        } catch { /* 테이블 아직 없으면 무시 */ }

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

        // Vision 결과 + 수동 브랜드 첨부
        Object.keys(map).forEach(id => {
            map[id].visionAnalysis = visionMap[id] || null;
            map[id].customBrands = customBrands;
        });

        return map;
    } catch (dbError) {
        console.warn('[API/Products] DB Query failed, continuing without overrides:', dbError);
        return {};
    }
}

// 최초 발견일 기록 (first_seen_at이 없는 상품에 현재 시간 저장)
async function recordFirstSeen(ids: string[], overrideMap: any) {
    const newIds = ids.filter(id => !overrideMap[id]?.first_seen_at);
    if (newIds.length === 0) return;

    const now = new Date().toISOString();
    // 배치로 upsert (50개씩)
    for (let i = 0; i < newIds.length; i += 50) {
        const batch = newIds.slice(i, i + 50);
        const values: any[] = [];
        const placeholders: string[] = [];
        batch.forEach((id, idx) => {
            const base = idx * 2;
            values.push(id, now);
            placeholders.push(`($${base + 1}, $${base + 2})`);
        });

        try {
            await db.query(
                `INSERT INTO product_overrides (id, first_seen_at)
                 VALUES ${placeholders.join(',')}
                 ON CONFLICT (id) DO UPDATE SET
                   first_seen_at = COALESCE(product_overrides.first_seen_at, EXCLUDED.first_seen_at)`,
                values
            );
        } catch (e) {
            console.warn('[recordFirstSeen] batch failed:', e);
        }
    }

    // overrideMap에도 반영 (processProducts에서 사용)
    newIds.forEach(id => {
        if (!overrideMap[id]) overrideMap[id] = {};
        overrideMap[id].first_seen_at = now;
    });

    console.log(`[recordFirstSeen] ${newIds.length}개 상품 최초 발견일 기록`);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const refresh = searchParams.get('refresh') === 'true';
    const stream = searchParams.get('stream') === 'true';
    const cacheOnly = searchParams.get('cacheOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const size = Math.min(parseInt(searchParams.get('size') || '20'), 100);
    const name = searchParams.get('name') || '';
    const stage = searchParams.get('stage') || 'ALL';
    const subStage = searchParams.get('subStage') || 'ALL';

    try {
        await ensureDbInitialized();

        // cacheOnly 모드: 서버 캐시가 있으면 반환, 없으면 빈 데이터 반환 (네이버 API 호출 안 함)
        if (cacheOnly) {
            if (productCache && (Date.now() - productCache.timestamp) < CACHE_TTL) {
                return handleSuccess({
                    contents: productCache.data.contents,
                    totalCount: productCache.data.totalCount,
                    statusCounts: productCache.data.statusCounts,
                    cached: true,
                    cachedAt: new Date(productCache.timestamp).toISOString()
                });
            }
            // 캐시 없음 → 빈 데이터 반환
            return handleSuccess({
                contents: [],
                totalCount: 0,
                statusCounts: { total: 0, wait: 0, sale: 0, outofstock: 0, unapproved: 0, suspension: 0, ended: 0, prohibited: 0 },
                cached: false,
                empty: true
            });
        }

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
                            data: { contents: filtered, totalCount: productCache!.data.totalCount, statusCounts: productCache!.data.statusCounts, cached: true, cachedAt: new Date(productCache!.timestamp).toISOString() }
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
                statusCounts: productCache.data.statusCounts,
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

                        // First page to get total count (Naver API는 1-based pagination)
                        const filters = buildSearchFilters(name);
                        const firstPage = await searchProducts(tokenData.access_token, 1, 100, filters);

                        const totalElements = firstPage.totalElements || 0;
                        const totalPages = firstPage.totalPages || Math.ceil(totalElements / 100);

                        send({ type: 'progress', percent: 20, message: `총 ${totalElements}개 상품 발견 (${totalPages} 페이지)` });

                        let allContents = [...(firstPage.contents || [])];

                        // Fetch remaining pages with progress updates (page 2 ~ totalPages)
                        if (totalPages > 1) {
                            const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
                            let completedPages = 1;

                            for (const p of remainingPages) {
                                let result: any;
                                try {
                                    result = await searchProducts(tokenData.access_token, p, 100, filters);
                                } catch (err) {
                                    console.warn(`[API/Products] Page ${p} failed, retrying...`);
                                    await new Promise(r => setTimeout(r, 500));
                                    try {
                                        result = await searchProducts(tokenData.access_token, p, 100, filters);
                                    } catch (retryErr) {
                                        console.error(`[API/Products] Page ${p} retry failed:`, retryErr);
                                        result = { contents: [] };
                                    }
                                }

                                if (result.contents) {
                                    allContents = allContents.concat(result.contents);
                                }
                                completedPages++;
                                const percent = 20 + Math.floor((completedPages / totalPages) * 60);
                                send({ type: 'progress', percent, message: `${completedPages}/${totalPages} 페이지 완료 (${allContents.length}개)` });
                            }
                        }

                        // 중복 제거
                        allContents = deduplicateContents(allContents);
                        send({ type: 'progress', percent: 85, message: `${allContents.length}개 상품 처리 중...` });

                        // Get overrides
                        const ids = allContents.map(p => p.originProductNo.toString()).filter(id => !!id);
                        const overrideMap = await fetchOverrideMap(ids);

                        // first_seen_at이 없는 상품에 현재 시간 기록
                        await recordFirstSeen(ids, overrideMap);

                        send({ type: 'progress', percent: 90, message: '분류 처리 중...' });

                        // Process all products
                        const processed = processProducts(allContents, overrideMap);
                        const statusCounts = calculateStatusCounts(processed);

                        // Cache the full result
                        productCache = {
                            data: { contents: processed, totalCount: totalElements, statusCounts },
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
                                statusCounts,
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

            const filters = buildSearchFilters(name);
            const firstPage = await searchProducts(tokenData.access_token, 1, 100, filters);

            const totalElements = firstPage.totalElements || 0;
            const totalPages = firstPage.totalPages || Math.ceil(totalElements / 100);

            let allContents = [...(firstPage.contents || [])];

            if (totalPages > 1) {
                const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
                const pageResults: any[] = [];
                for (const p of remainingPages) {
                    try {
                        const result = await searchProducts(tokenData.access_token, p, 100, filters);
                        pageResults.push(result);
                    } catch (err) {
                        console.warn(`[API/Products] Page ${p} failed, retrying...`);
                        await new Promise(r => setTimeout(r, 500));
                        try {
                            const result = await searchProducts(tokenData.access_token, p, 100, filters);
                            pageResults.push(result);
                        } catch (retryErr) {
                            console.error(`[API/Products] Page ${p} retry failed:`, retryErr);
                            pageResults.push({ contents: [] });
                        }
                    }
                }

                for (const result of pageResults) {
                    if (result.contents) {
                        allContents = allContents.concat(result.contents);
                    }
                }
            }

            // 중복 제거
            allContents = deduplicateContents(allContents);

            const ids = allContents.map(p => p.originProductNo.toString()).filter(id => !!id);
            const overrideMap = await fetchOverrideMap(ids);
            const processed = processProducts(allContents, overrideMap);
            const statusCounts = calculateStatusCounts(processed);

            productCache = {
                data: { contents: processed, totalCount: totalElements, statusCounts },
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
                statusCounts,
                page: 1,
                size: totalElements,
                hasMore: false,
                cached: false
            });

        } else {
            console.log(`[API/Products] Fetching page ${page}, size ${size}`);
            const naverRes = await searchProducts(tokenData.access_token, page, size, buildSearchFilters(name));

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
