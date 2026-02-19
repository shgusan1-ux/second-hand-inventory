/**
 * 상품 검수 API
 * GET: 기존 스캔 결과 조회
 * POST: SSE 스트리밍 딥 스캔 (배치 처리, offset 기반)
 * PUT: 개별 상품 재확인 (HEAD 이미지 체크 포함)
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { getNaverToken, getProductDetail } from '@/lib/naver/client';

export const maxDuration = 300; // 5분

const BATCH_SIZE = 150; // 한 번에 처리할 상품 수

// GET: 기존 스캔 결과 조회
export async function GET() {
    try {
        await ensureDbInitialized();
        const { rows } = await db.query(
            `SELECT origin_product_no, issues, detail_name, detail_image_url, detail_content_length, checked_at
             FROM product_audit
             WHERE issues != '[]' AND origin_product_no != '__dup_cache__'
             ORDER BY checked_at DESC`
        );
        return NextResponse.json({ results: rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
    }
}

// POST: SSE 딥 스캔 (배치 처리)
// Query params: offset (default 0)
export async function POST(request: Request) {
    await ensureDbInitialized();

    const url = new URL(request.url);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch { /* stream closed */ }
            };

            try {
                // 전체 상품 수 조회
                const { rows: countRows } = await db.query(
                    `SELECT COUNT(*) as cnt FROM naver_products WHERE status_type IN ('SALE', 'OUTOFSTOCK')`
                );
                const totalAll = parseInt(countRows[0].cnt);

                if (totalAll === 0) {
                    send({ type: 'complete', total: 0, batchTotal: 0, issues: 0, hasMore: false, nextOffset: 0, message: '검사할 상품이 없습니다' });
                    controller.close();
                    return;
                }

                // 배치 상품 가져오기
                const { rows: products } = await db.query(
                    `SELECT origin_product_no, name, thumbnail_url, sale_price, description_grade
                     FROM naver_products
                     WHERE status_type IN ('SALE', 'OUTOFSTOCK')
                     ORDER BY origin_product_no DESC
                     LIMIT $1 OFFSET $2`,
                    [BATCH_SIZE, offset]
                );

                if (products.length === 0) {
                    send({ type: 'complete', total: totalAll, batchTotal: 0, issues: 0, hasMore: false, nextOffset: offset, message: '더 이상 검사할 상품이 없습니다' });
                    controller.close();
                    return;
                }

                const hasMore = offset + products.length < totalAll;
                const nextOffset = offset + products.length;

                // 중복 이미지 감지: 전체 상품의 썸네일 URL 맵 구축
                // (첫 배치에서만 전체 이미지 맵을 구축하고, 이후 배치에서는 DB에서 조회)
                let duplicateThumbMap: Map<string, string[]> = new Map();
                if (offset === 0) {
                    // 전체 상품 썸네일 조회하여 중복 맵 구축
                    const { rows: allThumbs } = await db.query(
                        `SELECT origin_product_no, thumbnail_url FROM naver_products
                         WHERE status_type IN ('SALE', 'OUTOFSTOCK') AND thumbnail_url IS NOT NULL AND thumbnail_url != ''`
                    );
                    const urlToProducts = new Map<string, string[]>();
                    for (const t of allThumbs) {
                        const normalized = normalizeImageUrl(t.thumbnail_url);
                        if (!normalized) continue;
                        const list = urlToProducts.get(normalized) || [];
                        list.push(t.origin_product_no);
                        urlToProducts.set(normalized, list);
                    }
                    // 2개 이상 있는 것만 저장
                    for (const [url, pids] of urlToProducts) {
                        if (pids.length >= 2) {
                            duplicateThumbMap.set(url, pids);
                        }
                    }
                    // 중복 맵을 DB에 캐시 (이후 배치에서 사용)
                    const dupData = JSON.stringify(Object.fromEntries(duplicateThumbMap));
                    await db.query(
                        `INSERT INTO product_audit (origin_product_no, issues, detail_name, detail_image_url, detail_content_length, checked_at)
                         VALUES ('__dup_cache__', $1, '', '', 0, CURRENT_TIMESTAMP)
                         ON CONFLICT (origin_product_no) DO UPDATE SET issues = $1, checked_at = CURRENT_TIMESTAMP`,
                        [dupData]
                    );
                } else {
                    // 이전 배치에서 저장한 중복 맵 로드
                    const { rows: cacheRows } = await db.query(
                        `SELECT issues FROM product_audit WHERE origin_product_no = '__dup_cache__'`
                    );
                    if (cacheRows.length > 0) {
                        try {
                            const parsed = JSON.parse(cacheRows[0].issues);
                            for (const [url, pids] of Object.entries(parsed)) {
                                duplicateThumbMap.set(url, pids as string[]);
                            }
                        } catch { /* ignore */ }
                    }
                }

                // 최근 30분 이내 스캔된 상품 로드 (건너뛰기용)
                const { rows: recentAudits } = await db.query(
                    `SELECT origin_product_no, issues FROM product_audit
                     WHERE checked_at > datetime('now', '-30 minutes')
                     AND origin_product_no != '__dup_cache__'`
                );
                const recentMap = new Map<string, string[]>();
                for (const r of recentAudits) {
                    try {
                        recentMap.set(r.origin_product_no, typeof r.issues === 'string' ? JSON.parse(r.issues) : r.issues);
                    } catch { /* skip */ }
                }

                send({ type: 'start', total: totalAll, batchSize: products.length, offset, hasMore, skippable: recentMap.size });

                const tokenData = await getNaverToken();
                let totalIssues = 0;
                let skipped = 0;
                const issueCounts: Record<string, number> = {};

                for (let i = 0; i < products.length; i++) {
                    const p = products[i];
                    const pid = p.origin_product_no;
                    const shortName = (p.name || '').substring(0, 30);

                    // 최근 30분 이내 스캔된 상품은 건너뛰기
                    if (recentMap.has(pid)) {
                        const cachedIssues = recentMap.get(pid)!;
                        skipped++;
                        if (cachedIssues.length > 0) {
                            totalIssues++;
                            cachedIssues.forEach(issue => {
                                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
                            });
                        }
                        send({
                            type: 'progress',
                            current: offset + i + 1,
                            total: totalAll,
                            product: shortName,
                            productNo: pid,
                            issues: cachedIssues,
                            skipped: true,
                            message: '(캐시) ' + (cachedIssues.length > 0 ? `문제 ${cachedIssues.length}건` : '정상')
                        });
                        continue;
                    }

                    const issues: string[] = [];

                    try {
                        // 1. 기본 체크 (DB 데이터 기반)
                        if (!p.thumbnail_url) {
                            issues.push('NO_THUMBNAIL');
                        }
                        if (!p.sale_price || p.sale_price <= 0) {
                            issues.push('PRICE_ZERO');
                        }

                        // 2. 중복 이미지 체크
                        if (p.thumbnail_url) {
                            const normalized = normalizeImageUrl(p.thumbnail_url);
                            const dupList = duplicateThumbMap.get(normalized);
                            if (dupList && dupList.length >= 2) {
                                issues.push('IMAGE_DUPLICATE');
                            }
                        }

                        // 3. 네이버 상세페이지 조회
                        const detail = await getProductDetail(tokenData.access_token, parseInt(pid));
                        const op = detail.originProduct;

                        let detailName = '';
                        let detailImageUrl = '';
                        let detailContentLength = 0;

                        if (op) {
                            detailName = op.name || '';
                            detailImageUrl = op.images?.representativeImage?.url || '';
                            const detailContent = op.detailContent || '';
                            const plainText = detailContent.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
                            detailContentLength = plainText.length;

                            // 4. 상품명 불일치 체크
                            if (detailName && p.name && detailName !== p.name) {
                                const listingBrand = extractBrandFromName(p.name);
                                const detailBrand = extractBrandFromName(detailName);
                                if (listingBrand && detailBrand && listingBrand.toLowerCase() !== detailBrand.toLowerCase()) {
                                    issues.push('NAME_MISMATCH');
                                }
                            }

                            // 5. 상세내용에서 상품명 키워드 매칭 체크
                            if (plainText.length > 0) {
                                const brandFromName = extractBrandFromName(p.name);
                                if (brandFromName && brandFromName.length >= 3) {
                                    const brandInContent = plainText.toLowerCase().includes(brandFromName.toLowerCase());
                                    const brandInDetailName = detailName.toLowerCase().includes(brandFromName.toLowerCase());
                                    if (!brandInContent && !brandInDetailName) {
                                        if (!issues.includes('NAME_MISMATCH')) {
                                            issues.push('NAME_MISMATCH');
                                        }
                                    }
                                }
                            }

                            // 6. 대표이미지 불일치 체크
                            if (p.thumbnail_url && detailImageUrl) {
                                const thumbBase = normalizeImageUrl(p.thumbnail_url);
                                const detailBase = normalizeImageUrl(detailImageUrl);
                                if (thumbBase && detailBase && thumbBase !== detailBase) {
                                    issues.push('IMAGE_MISMATCH');
                                }
                            }

                            // 7. 상세내용 없음/짧음
                            if (detailContentLength < 50) {
                                issues.push('NO_DETAIL');
                            }

                            // 8. GRADE 패턴 체크
                            const gradeMatch = plainText.match(/GRADE\s*:\s*([SABV])\b/i);
                            if (!gradeMatch && !p.description_grade) {
                                issues.push('NO_GRADE');
                            }
                        } else {
                            issues.push('NO_DETAIL');
                        }

                        // NOTE: HEAD 이미지 체크는 벌크 스캔에서 제거 (타임아웃 원인)
                        // 개별 재확인(PUT)에서만 수행

                        // DB 저장 (upsert)
                        await db.query(
                            `INSERT INTO product_audit (origin_product_no, issues, detail_name, detail_image_url, detail_content_length, checked_at)
                             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                             ON CONFLICT (origin_product_no) DO UPDATE SET
                               issues = $2, detail_name = $3, detail_image_url = $4, detail_content_length = $5, checked_at = CURRENT_TIMESTAMP`,
                            [pid, JSON.stringify(issues), detailName, detailImageUrl, detailContentLength]
                        );

                        if (issues.length > 0) {
                            totalIssues++;
                            issues.forEach(issue => {
                                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
                            });
                        }

                        send({
                            type: 'progress',
                            current: offset + i + 1,
                            total: totalAll,
                            product: shortName,
                            productNo: pid,
                            issues,
                            message: issues.length > 0 ? `문제 ${issues.length}건: ${issues.join(', ')}` : '정상'
                        });

                    } catch (e: any) {
                        send({
                            type: 'progress',
                            current: offset + i + 1,
                            total: totalAll,
                            product: shortName,
                            productNo: pid,
                            issues: ['SCAN_ERROR'],
                            message: `오류: ${e.message?.substring(0, 50)}`
                        });
                    }

                    // Rate limiting (0.1초 - HEAD 체크 제거로 단축)
                    if (i < products.length - 1) {
                        await new Promise(r => setTimeout(r, 100));
                    }
                }

                send({
                    type: 'complete',
                    total: totalAll,
                    batchTotal: products.length,
                    issues: totalIssues,
                    issueCounts,
                    hasMore,
                    nextOffset,
                    skipped,
                    message: hasMore
                        ? `배치 완료: ${offset + products.length}/${totalAll} (${totalIssues}건 문제${skipped > 0 ? `, ${skipped}건 캐시` : ''})`
                        : `스캔 완료: ${totalAll}개 중 ${totalIssues}개 문제 발견${skipped > 0 ? ` (${skipped}건 캐시)` : ''}`
                });
            } catch (e: any) {
                send({ type: 'error', message: e.message });
            }

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

// PUT: 개별 상품 재확인 (HEAD 이미지 체크 포함)
export async function PUT(request: Request) {
    await ensureDbInitialized();

    try {
        const { productNo } = await request.json();
        if (!productNo) {
            return NextResponse.json({ error: 'productNo 필수' }, { status: 400 });
        }

        // 상품 정보 조회
        const { rows } = await db.query(
            `SELECT origin_product_no, name, thumbnail_url, sale_price, description_grade
             FROM naver_products WHERE origin_product_no = $1`,
            [productNo]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });
        }

        const p = rows[0];
        const issues: string[] = [];

        // 기본 체크
        if (!p.thumbnail_url) issues.push('NO_THUMBNAIL');
        if (!p.sale_price || p.sale_price <= 0) issues.push('PRICE_ZERO');

        // 중복 이미지 체크
        if (p.thumbnail_url) {
            const normalized = normalizeImageUrl(p.thumbnail_url);
            const { rows: allThumbs } = await db.query(
                `SELECT origin_product_no, thumbnail_url FROM naver_products
                 WHERE thumbnail_url IS NOT NULL AND thumbnail_url != ''
                 AND origin_product_no != $1
                 AND status_type IN ('SALE', 'OUTOFSTOCK')`,
                [productNo]
            );
            const hasDuplicate = allThumbs.some(t => normalizeImageUrl(t.thumbnail_url) === normalized);
            if (hasDuplicate) {
                issues.push('IMAGE_DUPLICATE');
            }
        }

        // 네이버 상세페이지 조회
        const tokenData = await getNaverToken();
        const detail = await getProductDetail(tokenData.access_token, parseInt(productNo));
        const op = detail.originProduct;

        let detailName = '';
        let detailImageUrl = '';
        let detailContentLength = 0;

        if (op) {
            detailName = op.name || '';
            detailImageUrl = op.images?.representativeImage?.url || '';
            const detailContent = op.detailContent || '';
            const plainText = detailContent.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
            detailContentLength = plainText.length;

            // 상품명 불일치
            if (detailName && p.name) {
                const listingBrand = extractBrandFromName(p.name);
                const detailBrand = extractBrandFromName(detailName);
                if (listingBrand && detailBrand && listingBrand.toLowerCase() !== detailBrand.toLowerCase()) {
                    issues.push('NAME_MISMATCH');
                }
                if (listingBrand && listingBrand.length >= 3 && plainText.length > 0) {
                    if (!plainText.toLowerCase().includes(listingBrand.toLowerCase()) && !detailName.toLowerCase().includes(listingBrand.toLowerCase())) {
                        if (!issues.includes('NAME_MISMATCH')) issues.push('NAME_MISMATCH');
                    }
                }
            }

            // 대표이미지 불일치
            if (p.thumbnail_url && detailImageUrl) {
                const thumbBase = normalizeImageUrl(p.thumbnail_url);
                const detailBase = normalizeImageUrl(detailImageUrl);
                if (thumbBase && detailBase && thumbBase !== detailBase) {
                    issues.push('IMAGE_MISMATCH');
                }
            }

            // 상세내용 없음
            if (detailContentLength < 50) issues.push('NO_DETAIL');

            // GRADE 체크
            const gradeMatch = plainText.match(/GRADE\s*:\s*([SABV])\b/i);
            if (!gradeMatch && !p.description_grade) issues.push('NO_GRADE');
        } else {
            issues.push('NO_DETAIL');
        }

        // 이미지 접근 체크 (개별 재확인에서만)
        if (p.thumbnail_url) {
            try {
                const imgRes = await fetch(p.thumbnail_url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
                if (!imgRes.ok) issues.push('IMAGE_BROKEN');
            } catch {
                issues.push('IMAGE_BROKEN');
            }
        }

        // DB 저장
        await db.query(
            `INSERT INTO product_audit (origin_product_no, issues, detail_name, detail_image_url, detail_content_length, checked_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             ON CONFLICT (origin_product_no) DO UPDATE SET
               issues = $2, detail_name = $3, detail_image_url = $4, detail_content_length = $5, checked_at = CURRENT_TIMESTAMP`,
            [productNo, JSON.stringify(issues), detailName, detailImageUrl, detailContentLength]
        );

        return NextResponse.json({ success: true, productNo, issues });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 상품명에서 브랜드 추출 (영문 부분)
function extractBrandFromName(name: string): string {
    if (!name) return '';
    const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
    return match ? match[1].trim() : '';
}

// 상품명에서 한글 설명 부분 추출
function extractKoreanPart(name: string): string {
    if (!name) return '';
    const match = name.match(/[가-힣].+/);
    return match ? match[0].trim() : '';
}

// 편집 거리 (Levenshtein distance)
function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

// 알려진 브랜드 목록 (흔히 오타가 나는 브랜드)
const KNOWN_BRANDS = [
    'BURBERRY', 'GUCCI', 'PRADA', 'LOUIS VUITTON', 'CHANEL', 'HERMES',
    'BALENCIAGA', 'BOTTEGA VENETA', 'SAINT LAURENT', 'VALENTINO', 'VERSACE',
    'FENDI', 'DIOR', 'CELINE', 'GIVENCHY', 'LOEWE', 'MONCLER', 'MIUMIU',
    'ALEXANDER MCQUEEN', 'ALEXANDER WANG', 'ACNE STUDIOS', 'AMI', 'APC',
    'BALMAIN', 'BRUNELLO CUCINELLI', 'CANADA GOOSE', 'COACH', 'COMME DES GARCONS',
    'DOLCE & GABBANA', 'DSQUARED2', 'ETRO', 'FERRAGAMO', 'GIORGIO ARMANI',
    'ISABEL MARANT', 'JACQUEMUS', 'JIMMY CHOO', 'KENZO', 'LANVIN',
    'MAISON MARGIELA', 'MARC JACOBS', 'MARNI', 'MAX MARA', 'MICHAEL KORS',
    'MOSCHINO', 'MULBERRY', 'OFF-WHITE', 'PALM ANGELS', 'RALPH LAUREN',
    'RICK OWENS', 'ROGER VIVIER', 'SALVATORE FERRAGAMO', 'STELLA MCCARTNEY',
    'STONE ISLAND', 'STUART WEITZMAN', 'THOM BROWNE', 'TOM FORD', 'TORY BURCH',
    'VETEMENTS', 'VIVIENNE WESTWOOD', 'WOOYOUNGMI', 'ZEGNA',
    'NIKE', 'ADIDAS', 'NEW BALANCE', 'CONVERSE', 'VANS',
    'THE NORTH FACE', 'PATAGONIA', 'ARC\'TERYX', 'WOOLRICH',
];

// 브랜드명 오타 체크: 알려진 브랜드와 가까운 거리이면 오타
function findBrandTypo(brand: string): string | null {
    if (!brand || brand.length < 3) return null;
    const upper = brand.toUpperCase();
    for (const known of KNOWN_BRANDS) {
        if (upper === known) return null; // 정확히 일치 = 오타 아님
        const dist = levenshtein(upper, known);
        // 브랜드 길이에 따른 허용 거리: 짧으면 1, 길면 2
        const threshold = known.length <= 5 ? 1 : 2;
        if (dist > 0 && dist <= threshold) {
            return known; // 오타 가능: 올바른 브랜드명 반환
        }
    }
    return null;
}

// 상품명 이슈 종합 체크
function checkNameIssues(listingName: string, detailName: string, plainText: string): string[] {
    const issues: string[] = [];
    if (!listingName || !detailName) return issues;

    const listingBrand = extractBrandFromName(listingName);
    const detailBrand = extractBrandFromName(detailName);

    // 1. 브랜드 오타 체크 (알려진 브랜드 사전 기반)
    if (listingBrand) {
        const typoResult = findBrandTypo(listingBrand);
        if (typoResult) {
            issues.push('NAME_TYPO');
        }
    }

    // 2. 브랜드 불일치 체크
    if (listingBrand && detailBrand) {
        const lb = listingBrand.toLowerCase();
        const db = detailBrand.toLowerCase();
        if (lb !== db) {
            const dist = levenshtein(lb, db);
            if (dist <= 2 && lb.length >= 4) {
                // 편집거리 1-2: 리스팅↔상세 간 오타 가능성
                if (!issues.includes('NAME_TYPO')) issues.push('NAME_TYPO');
            } else {
                // 편집거리 3+: 완전히 다른 브랜드 = 밀린 상품
                issues.push('NAME_MISMATCH');
            }
        }
    }

    // 3. 한글 부분 비교 (리스팅 vs 상세페이지)
    if (listingName !== detailName && !issues.includes('NAME_MISMATCH')) {
        const listingKr = extractKoreanPart(listingName);
        const detailKr = extractKoreanPart(detailName);
        if (listingKr && detailKr && listingKr !== detailKr) {
            const dist = levenshtein(listingKr, detailKr);
            const maxLen = Math.max(listingKr.length, detailKr.length);
            if (dist > 0 && dist <= 2) {
                // 한글 부분 1-2자 차이 = 오타 가능
                if (!issues.includes('NAME_TYPO')) issues.push('NAME_TYPO');
            } else if (dist > maxLen * 0.5) {
                // 한글 부분이 절반 이상 다르면 불일치
                if (!issues.includes('NAME_MISMATCH')) issues.push('NAME_MISMATCH');
            }
        }
    }

    // 4. 상세내용에서 브랜드 키워드 매칭 체크
    if (listingBrand && listingBrand.length >= 3 && plainText.length > 0) {
        const brandLower = listingBrand.toLowerCase();
        const brandInContent = plainText.toLowerCase().includes(brandLower);
        const brandInDetailName = detailName.toLowerCase().includes(brandLower);
        if (!brandInContent && !brandInDetailName) {
            // 상세내용에도, 상세페이지 상품명에도 브랜드가 없으면 밀린 상품 가능성
            if (!issues.includes('NAME_MISMATCH') && !issues.includes('NAME_TYPO')) {
                issues.push('NAME_MISMATCH');
            }
        }
    }

    return issues;
}

// 이미지 URL 정규화 (쿼리 파라미터 제거, 도메인 차이 무시)
function normalizeImageUrl(url: string): string {
    try {
        const u = new URL(url);
        // 경로의 마지막 부분만 비교 (파일명)
        const path = u.pathname;
        return path.split('/').pop() || path;
    } catch {
        return url;
    }
}
