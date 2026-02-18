// 가상피팅 AI 추천 순위 - 판매 잠재력 기반 정렬
import { lookupBrand } from '@/lib/classification/brand-tier-database';

interface ProductForRanking {
    originProductNo: string;
    name: string;
    salePrice?: number;
    channelProductDisplayCategoryNoList?: string[];
    visionGrade?: string;
    representativeImage?: { url: string };
    registeredDate?: string;
    fittingDone?: boolean;
}

export interface RankedProduct {
    originProductNo: string;
    score: number;
    reasons: string[];
}

// 가격대 점수 (3만~15만원이 중고 의류 판매 스위트스팟)
function priceScore(price?: number): number {
    if (!price) return 30;
    if (price >= 30000 && price <= 80000) return 100;
    if (price >= 80000 && price <= 150000) return 85;
    if (price >= 15000 && price <= 30000) return 60;
    if (price >= 150000 && price <= 300000) return 50;
    return 20;
}

// 이미지 품질 등급 점수
function gradeScore(grade?: string): number {
    switch (grade) {
        case 'S': return 100;
        case 'A': return 80;
        case 'B': return 50;
        case 'V': return 30;
        default: return 40;
    }
}

// 최신순 점수 (최근 2주 내 등록 상품 우대)
function recencyScore(registeredDate?: string): number {
    if (!registeredDate) return 50;
    const days = (Date.now() - new Date(registeredDate).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 3) return 100;
    if (days <= 7) return 80;
    if (days <= 14) return 60;
    if (days <= 30) return 40;
    return 20;
}

export function rankProductsBySalesPotential(products: ProductForRanking[]): RankedProduct[] {
    const WEIGHTS = {
        brandTier: 0.30,
        priceRange: 0.20,
        imageQuality: 0.15,
        categoryPopularity: 0.15,
        recency: 0.10,
        fittingPending: 0.10,
    };

    return products.map(p => {
        const reasons: string[] = [];
        let totalScore = 0;

        // 브랜드 티어
        const brand = lookupBrand(p.name);
        const brandScore = brand.info ? Math.min(100, brand.tier === 'HERITAGE_EUROPE' ? 100 : brand.tier === 'BRITISH_ARCHIVE' ? 90 : brand.tier === 'JAPANESE_ARCHIVE' ? 85 : brand.tier === 'OUTDOOR_ARCHIVE' ? 70 : brand.tier === 'MILITARY_ARCHIVE' ? 75 : brand.tier === 'WORKWEAR_ARCHIVE' ? 70 : 50) : 30;
        totalScore += brandScore * WEIGHTS.brandTier;
        if (brandScore >= 80) reasons.push(`프리미엄 브랜드 (${brand.info?.brand || ''})`);

        // 가격대
        const pScore = priceScore(p.salePrice);
        totalScore += pScore * WEIGHTS.priceRange;
        if (pScore >= 85) reasons.push('인기 가격대');

        // 이미지 품질
        const gScore = gradeScore(p.visionGrade);
        totalScore += gScore * WEIGHTS.imageQuality;
        if (gScore >= 80) reasons.push(`이미지 품질 ${p.visionGrade}등급`);

        // 카테고리 인기도 (남녀 의류 균등)
        const catScore = 60; // 기본값, 추후 판매 데이터 기반으로 개선 가능
        totalScore += catScore * WEIGHTS.categoryPopularity;

        // 최신순
        const rScore = recencyScore(p.registeredDate);
        totalScore += rScore * WEIGHTS.recency;
        if (rScore >= 80) reasons.push('신규 등록');

        // 피팅 미완료 우대
        const fScore = p.fittingDone ? 0 : 100;
        totalScore += fScore * WEIGHTS.fittingPending;
        if (!p.fittingDone) reasons.push('피팅 미완료');

        return {
            originProductNo: p.originProductNo,
            score: Math.round(totalScore),
            reasons,
        };
    }).sort((a, b) => b.score - a.score);
}
