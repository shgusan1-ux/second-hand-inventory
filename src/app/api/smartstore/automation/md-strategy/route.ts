/**
 * 스마트 MD 전략 API — 라이프사이클 자동 배치
 *
 * 전체 상품을 분석하여 CLEARANCE 이동 대상을 선별합니다.
 *
 * GET  /api/smartstore/automation/md-strategy  — 현재 상태 분석 + 추천
 * POST /api/smartstore/automation/md-strategy  — 추천된 상품 이동 실행
 *
 * MD 판단 기준:
 * 1. 체류기간: 90일+ → 강력 추천, 60일+ → 추천
 * 2. 상태: SUSPENSION/OUTOFSTOCK → 안 팔리는 상품
 * 3. 가격대: 저가 상품은 70% 할인으로 매력적
 * 4. 브랜드 포화도: 같은 브랜드 너무 많으면 일부 이동
 * 5. 다양성: CLEARANCE에도 다양한 브랜드/카테고리 배치
 * 6. 시즌 미스매치: 겨울에 여름 아이템 등
 */
import { getNaverToken, searchProducts } from '@/lib/naver/client';
import { calculateLifecycle, fetchLifecycleSettings } from '@/lib/classification/lifecycle';
import { db } from '@/lib/db';

export const maxDuration = 120;

// 판매 상태 기준
const STATUS_FILTER = ['SALE', 'OUTOFSTOCK', 'SUSPENSION'];

// 상품 데이터를 플랫하게 변환 (channelProducts[0] → 최상위)
function flattenProduct(p: any) {
    const cp = p.channelProducts?.[0];
    if (!cp) return null;
    return {
        originProductNo: p.originProductNo,
        name: cp.name || '',
        salePrice: cp.salePrice || 0,
        statusType: cp.statusType || '',
        regDate: cp.regDate || '',
        categoryId: cp.categoryId || '',
        brandName: cp.brandName || '',
        stockQuantity: cp.stockQuantity || 0,
        sellerManagementCode: cp.sellerManagementCode || '',
    };
}

// MD 점수 기준 (높을수록 CLEARANCE 이동 추천)
function calculateClearanceScore(product: any): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const daysSince = product.lifecycle?.daysSince || 0;
    const price = product.salePrice || 0;
    const status = product.statusType || '';
    const name = (product.name || '').toUpperCase();

    // 1. 체류기간 (최대 40점)
    if (daysSince >= 120) {
        score += 40;
        reasons.push(`${daysSince}일 체류 (120일+)`);
    } else if (daysSince >= 90) {
        score += 30;
        reasons.push(`${daysSince}일 체류 (90일+)`);
    } else if (daysSince >= 60) {
        score += 20;
        reasons.push(`${daysSince}일 체류 (60일+)`);
    } else if (daysSince >= 30) {
        score += 5;
        reasons.push(`${daysSince}일 체류`);
    }

    // 2. 판매 상태 (최대 25점)
    if (status === 'SUSPENSION') {
        score += 25;
        reasons.push('판매중지 상태');
    } else if (status === 'OUTOFSTOCK') {
        score += 15;
        reasons.push('품절 상태');
    }

    // 3. 저가 상품 = 70% 할인 매력적 (최대 15점)
    if (price <= 15000) {
        score += 15;
        reasons.push(`저가 ${price.toLocaleString()}원 → 할인가 ${Math.round(price * 0.3).toLocaleString()}원`);
    } else if (price <= 25000) {
        score += 10;
        reasons.push(`중저가 ${price.toLocaleString()}원`);
    } else if (price <= 40000) {
        score += 5;
    }

    // 4. 시즌 아웃 힌트 (최대 10점)
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const isSummer = month >= 5 && month <= 9;
    const isWinter = month >= 11 || month <= 2;

    if (isSummer && (name.includes('패딩') || name.includes('다운') || name.includes('울') || name.includes('코트') || name.includes('니트') || name.includes('플리스'))) {
        score += 10;
        reasons.push('여름에 겨울 아이템');
    }
    if (isWinter && (name.includes('반팔') || name.includes('린넨') || name.includes('리넨') || name.includes('쇼츠') || name.includes('반바지'))) {
        score += 10;
        reasons.push('겨울에 여름 아이템');
    }

    // 5. 기본 아이템 (특별함 없는 기본 티셔츠 등) (최대 10점)
    if (name.includes('기본') || name.includes('베이직') || name.includes('무지') || name.includes('솔리드')) {
        score += 5;
        reasons.push('기본 아이템');
    }

    return { score, reasons };
}

function extractBrand(name: string): string {
    const match = (name || '').match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
    return match ? match[1].trim() : (name || '').split(' ')[0];
}

export async function GET() {
    try {
        // 1. 네이버 상품 전체 조회
        const tokenData = await getNaverToken();
        const token = tokenData.access_token;
        const settings = await fetchLifecycleSettings();

        let allProducts: any[] = [];
        let page = 1;
        const pageSize = 100;

        while (true) {
            const result = await searchProducts(token, page, pageSize, {
                productStatusTypes: STATUS_FILTER,
            });
            if (result.contents.length === 0) break;

            // 플랫 변환
            for (const raw of result.contents) {
                const flat = flattenProduct(raw);
                if (flat) allProducts.push(flat);
            }

            if (allProducts.length >= result.totalElements) break;
            page++;
        }

        // 2. DB에서 내부 카테고리 조회
        const overrides = await db.query('SELECT id, internal_category, override_date FROM product_overrides');
        const overrideMap = new Map<string, any>();
        for (const row of overrides.rows) {
            overrideMap.set(row.id, row);
        }

        // 3. 라이프사이클 계산 + 내부 카테고리 부여
        const enriched = allProducts.map(p => {
            const override = overrideMap.get(p.originProductNo?.toString());
            const baseDate = override?.override_date || p.regDate || new Date().toISOString();
            const lifecycle = calculateLifecycle(baseDate, undefined, settings);
            const internalCat = override?.internal_category || lifecycle.stage;
            return { ...p, lifecycle, internalCategory: internalCat };
        });

        // 4. CLEARANCE가 아닌 모든 상품을 대상으로 (NEW, CURATED, ARCHIVE 포함)
        const EXCLUDE_CATS = ['CLEARANCE', 'CLEARANCE_KEEP', 'CLEARANCE_DISPOSE'];
        const candidates = enriched.filter(p => !EXCLUDE_CATS.includes(p.internalCategory));

        // 5. 각 상품에 CLEARANCE 점수 부여
        const scored = candidates.map(p => {
            const { score, reasons } = calculateClearanceScore(p);
            return { ...p, clearanceScore: score, clearanceReasons: reasons };
        }).sort((a, b) => b.clearanceScore - a.clearanceScore);

        // 6. 브랜드 포화도 분석
        const brandCounts: Record<string, number> = {};
        for (const p of candidates) {
            const brand = extractBrand(p.name);
            brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        }
        const saturatedBrands = Object.entries(brandCounts)
            .filter(([b, count]) => b && count >= 5)
            .sort((a, b) => b[1] - a[1]);

        // 7. 추천 목록 생성 (score 30+ = 강력 추천, 15+ = 추천)
        const strongRecommend = scored.filter(p => p.clearanceScore >= 30);
        const recommend = scored.filter(p => p.clearanceScore >= 15 && p.clearanceScore < 30);

        // 8. 현재 분포 요약
        const distribution: Record<string, number> = {};
        for (const p of enriched) {
            distribution[p.internalCategory] = (distribution[p.internalCategory] || 0) + 1;
        }

        return Response.json({
            summary: {
                total: enriched.length,
                distribution,
                candidateCount: candidates.length,
                strongRecommendCount: strongRecommend.length,
                recommendCount: recommend.length,
                totalRecommend: strongRecommend.length + recommend.length,
            },
            saturatedBrands: saturatedBrands.slice(0, 20).map(([brand, count]) => ({ brand, count })),
            strongRecommend: strongRecommend.map(p => ({
                id: p.originProductNo,
                name: (p.name || '').substring(0, 60),
                price: p.salePrice,
                daysSince: p.lifecycle?.daysSince,
                status: p.statusType,
                category: p.internalCategory,
                score: p.clearanceScore,
                reasons: p.clearanceReasons,
            })),
            recommend: recommend.slice(0, 100).map(p => ({
                id: p.originProductNo,
                name: (p.name || '').substring(0, 60),
                price: p.salePrice,
                daysSince: p.lifecycle?.daysSince,
                status: p.statusType,
                category: p.internalCategory,
                score: p.clearanceScore,
                reasons: p.clearanceReasons,
            })),
            allCandidateIds: [...strongRecommend, ...recommend].map(p => p.originProductNo?.toString()),
        });

    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

// POST: 추천 상품을 CLEARANCE로 이동
export async function POST(request: Request) {
    try {
        const { ids, category = 'CLEARANCE' } = await request.json();

        if (!Array.isArray(ids) || ids.length === 0) {
            return Response.json({ error: 'ids 배열이 필요합니다' }, { status: 400 });
        }

        const now = new Date();
        const values: any[] = [];
        const valueStrings: string[] = [];

        ids.forEach((id: string, index: number) => {
            const base = index * 3;
            values.push(id);
            values.push(category);
            values.push(now);
            valueStrings.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        });

        await db.query(
            `INSERT INTO product_overrides (id, internal_category, updated_at)
             VALUES ${valueStrings.join(',')}
             ON CONFLICT (id) DO UPDATE
             SET internal_category = EXCLUDED.internal_category, updated_at = EXCLUDED.updated_at`,
            values
        );

        // 캐시 무효화
        try {
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
            await fetch(`${baseUrl}/api/smartstore/products?invalidateCache=true&_internal=bs-internal-2024`);
        } catch { /* 무시 */ }

        return Response.json({
            success: true,
            count: ids.length,
            message: `${ids.length}개 상품이 ${category}(으)로 이동되었습니다.`,
        });

    } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
