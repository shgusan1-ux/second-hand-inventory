
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, handleSuccess } from '@/lib/api-utils';
import { invalidateProductCache } from '../route';

// 빈티지 시장 수요 기반 선호브랜드 점수
const POPULAR_BRANDS: Record<string, number> = {
    // S티어 (35점)
    'BURBERRY': 35, 'BARBOUR': 35, 'STONE ISLAND': 35, 'CP COMPANY': 35,
    'PATAGONIA': 35, "ARC'TERYX": 35, 'ARCTERYX': 35,
    'COMME DES GARCONS': 35, 'ISSEY MIYAKE': 35, 'YOHJI YAMAMOTO': 35,
    'POLO RALPH LAUREN': 35, 'RALPH LAUREN': 35, 'RRL': 35,
    'RED WING': 35, "LEVI'S": 35, 'LEVIS': 35, 'SCHOTT': 35,
    "THE REAL MCCOY'S": 35, 'REAL MCCOYS': 35, 'BUZZ RICKSON': 35,
    'FILSON': 35, 'NIGEL CABOURN': 35,
    // A티어 (26점)
    'CARHARTT': 26, 'THE NORTH FACE': 26, 'NORTH FACE': 26,
    'STUSSY': 26, 'CHAMPION': 26, 'NIKE': 26, 'ADIDAS': 26,
    'FRED PERRY': 26, 'LACOSTE': 26, 'BEN SHERMAN': 26,
    'COLUMBIA': 26, 'L.L.BEAN': 26, 'LL BEAN': 26, 'PENDLETON': 26,
    'DICKIES': 26, 'TIMBERLAND': 26, 'WRANGLER': 26, 'LEE': 26,
    'WOOLRICH': 26, 'SIERRA DESIGNS': 26, 'HELLY HANSEN': 26,
    'DANTON': 26, 'ORSLOW': 26, 'KAPITAL': 26, 'VISVIM': 26,
    'ENGINEERED GARMENTS': 26, 'BEAMS': 26,
    // B티어 (17점)
    'GAP': 17, 'EDDIE BAUER': 17, 'LANDS END': 17, 'BANANA REPUBLIC': 17,
    'J.CREW': 17, 'BROOKS BROTHERS': 17, 'TOMMY HILFIGER': 17,
    'NAUTICA': 17, 'HANES': 17, 'RUSSELL': 17,
    'UNIQLO': 17, 'ZARA': 17, 'H&M': 17,
    'NEW BALANCE': 17, 'PUMA': 17, 'REEBOK': 17, 'CONVERSE': 17,
};

const ARCHIVE_SUBS = ['MILITARY ARCHIVE', 'WORKWEAR ARCHIVE', 'OUTDOOR ARCHIVE', 'JAPANESE ARCHIVE', 'HERITAGE EUROPE', 'BRITISH ARCHIVE', 'UNISEX ARCHIVE'];
const STAGE_LIMIT = 200;

interface ProductInfo {
    id: string;
    name: string;
    salePrice: number;
    brandName: string;
    brandTier: string;
    grade: string;
    daysSince: number;
    currentCategory: string;
}

function extractBrand(name: string): string {
    const match = name.match(/^([A-Z0-9&.'\-\s]+?)(?=\s+[가-힣])/);
    return match ? match[1].trim() : name.split(' ')[0];
}

function keepScore(p: ProductInfo, categoryProducts: ProductInfo[]): number {
    const brand = p.brandName.toUpperCase();
    let brandScore = POPULAR_BRANDS[brand] || 0;
    if (brandScore === 0) {
        const tierFallback: Record<string, number> = { 'LUXURY': 30, 'PREMIUM': 20, 'MID': 10, 'BASIC': 4 };
        brandScore = tierFallback[p.brandTier] || 0;
    }
    const prices = categoryProducts.map(cp => cp.salePrice).sort((a, b) => a - b);
    const priceRank = prices.indexOf(p.salePrice);
    const priceScore = prices.length > 1 ? Math.round((priceRank / (prices.length - 1)) * 30) : 15;
    const gradeMap: Record<string, number> = { 'V': 25, 'V급': 25, 'S': 19, 'S급': 19, 'A': 12, 'A급': 12, 'B': 5, 'B급': 5 };
    const gradeScore = gradeMap[p.grade] || 0;
    const freshScore = Math.max(0, Math.round((1 - Math.min(p.daysSince, 180) / 180) * 10));
    return brandScore + priceScore + gradeScore + freshScore;
}

function isArchiveCategory(cat: string) {
    return cat === 'ARCHIVE' || ARCHIVE_SUBS.includes(cat);
}
function isClearanceCategory(cat: string) {
    return cat === 'CLEARANCE' || cat === 'CLEARANCE_KEEP' || cat === 'CLEARANCE_DISPOSE';
}

// 재배치 핵심 로직 (UI + Cron 공용)
export async function executeRebalance(productsData: any[]) {
    const allProducts: ProductInfo[] = productsData.map((p: any) => ({
        id: String(p.originProductNo),
        name: p.name || '',
        salePrice: p.salePrice || 0,
        brandName: p.classification?.brand || extractBrand(p.name || ''),
        brandTier: p.classification?.brandTier || '',
        grade: p.classification?.visionGrade || p.descriptionGrade || '',
        daysSince: p.lifecycle?.daysSince || 0,
        currentCategory: p.internalCategory || '',
    }));

    const products = allProducts.filter(p => p.currentCategory !== 'KIDS');
    const kidsCount = allProducts.length - products.length;

    const newProducts = products.filter(p => p.currentCategory === 'NEW');
    const curatedProducts = products.filter(p => p.currentCategory === 'CURATED');
    const archiveProducts = products.filter(p => isArchiveCategory(p.currentCategory));

    const moves: { id: string; from: string; to: string }[] = [];

    // NEW 초과 → CURATED
    if (newProducts.length > STAGE_LIMIT) {
        const sorted = [...newProducts].sort((a, b) => keepScore(a, newProducts) - keepScore(b, newProducts));
        sorted.slice(0, newProducts.length - STAGE_LIMIT).forEach(p => {
            moves.push({ id: p.id, from: 'NEW', to: 'CURATED' });
            p.currentCategory = 'CURATED';
            curatedProducts.push(p);
        });
    }

    // CURATED 초과 → ARCHIVE
    if (curatedProducts.length > STAGE_LIMIT) {
        const sorted = [...curatedProducts].sort((a, b) => keepScore(a, curatedProducts) - keepScore(b, curatedProducts));
        sorted.slice(0, curatedProducts.length - STAGE_LIMIT).forEach(p => {
            moves.push({ id: p.id, from: p.currentCategory, to: 'ARCHIVE' });
            p.currentCategory = 'ARCHIVE';
            archiveProducts.push(p);
        });
    }

    // ARCHIVE 서브별 초과 → CLEARANCE
    for (const sub of ARCHIVE_SUBS) {
        const subProducts = archiveProducts.filter(p => p.currentCategory === sub);
        if (subProducts.length > STAGE_LIMIT) {
            const sorted = [...subProducts].sort((a, b) => keepScore(a, subProducts) - keepScore(b, subProducts));
            sorted.slice(0, subProducts.length - STAGE_LIMIT).forEach(p => {
                moves.push({ id: p.id, from: sub, to: 'CLEARANCE' });
                p.currentCategory = 'CLEARANCE';
            });
        }
    }

    // 미분류 ARCHIVE 초과 → CLEARANCE
    const unassigned = archiveProducts.filter(p => p.currentCategory === 'ARCHIVE');
    if (unassigned.length > STAGE_LIMIT) {
        const sorted = [...unassigned].sort((a, b) => keepScore(a, unassigned) - keepScore(b, unassigned));
        sorted.slice(0, unassigned.length - STAGE_LIMIT).forEach(p => {
            moves.push({ id: p.id, from: 'ARCHIVE', to: 'CLEARANCE' });
            p.currentCategory = 'CLEARANCE';
        });
    }

    // DB 일괄 업데이트
    if (moves.length > 0) {
        const now = new Date().toISOString();
        const batchSize = 50;
        for (let i = 0; i < moves.length; i += batchSize) {
            const batch = moves.slice(i, i + batchSize);
            const values: any[] = [];
            const valueStrings: string[] = [];
            batch.forEach((m, index) => {
                const base = index * 3;
                values.push(m.id, m.to, now);
                valueStrings.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
            });
            await db.query(`
                INSERT INTO product_overrides (id, internal_category, updated_at)
                VALUES ${valueStrings.join(',')}
                ON CONFLICT (id) DO UPDATE
                SET internal_category = EXCLUDED.internal_category, updated_at = EXCLUDED.updated_at
            `, values);
        }
    }

    invalidateProductCache();

    const beforeCounts = {
        NEW: productsData.filter((p: any) => p.internalCategory === 'NEW').length,
        CURATED: productsData.filter((p: any) => p.internalCategory === 'CURATED').length,
        ARCHIVE: productsData.filter((p: any) => isArchiveCategory(p.internalCategory)).length,
        CLEARANCE: productsData.filter((p: any) => isClearanceCategory(p.internalCategory)).length,
    };

    return {
        total: allProducts.length,
        kids: kidsCount,
        moved: moves.length,
        before: beforeCounts,
        moves: moves.reduce((acc, m) => {
            const key = `${m.from} → ${m.to}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };
}

// UI에서 호출 (POST, 인증 필요)
export async function POST(request: Request) {
    try {
        invalidateProductCache();

        const baseUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
        const cookie = request.headers.get('cookie') || '';

        const res = await fetch(`${baseUrl}/api/smartstore/products?fetchAll=true&invalidateCache=true`, {
            headers: { cookie },
        });
        const data = await res.json();

        if (!data.success || !data.data?.contents) {
            return NextResponse.json({ success: false, error: '상품 데이터 로드 실패' }, { status: 500 });
        }

        const summary = await executeRebalance(data.data.contents);

        return handleSuccess({
            success: true,
            message: `${summary.moved}개 상품 재배치 완료`,
            summary,
        });
    } catch (error: any) {
        return handleApiError(error, 'Product Rebalance');
    }
}
