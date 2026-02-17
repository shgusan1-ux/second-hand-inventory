
export interface RankProduct {
    originProductNo: string;
    internalCategory?: string;
    classification?: {
        brand?: string;
        brandTier?: string;
        visionGrade?: string;
        confidence?: number;
        gender?: string;
        clothingType?: string;
        clothingSubType?: string;
    };
    descriptionGrade?: string | null;
    lifecycle?: {
        daysSince: number;
    };
}

/**
 * 스마트스토어 메인 진열을 위한 판매 가능성 점수 계산 알고리즘
 * 
 * 1. 상품 상태 (Vision Grade) - 최대 60점
 * 2. 브랜드 티어 - 최대 50점
 * 3. 최신성 (업로드된지 얼마 안 된 상품) - 최대 50점
 * 4. 분류 신뢰도 - 최대 25점
 * 5. 온도/날씨 적합도 - 최대 40점 (가점)
 */
export function calculateSalesScore(p: RankProduct, currentTemp: number = 20) {
    // 0. 키즈 제외 (메인 진열 대상 아님)
    if (p.classification?.gender === 'KIDS') return 0;

    let score = 0;

    // 1. 상품 상태 (Vision Grade) - S급/A급 우대
    const grade = p.classification?.visionGrade || (p.descriptionGrade ? `${p.descriptionGrade}급` : 'B급');
    if (grade.includes('V')) score += 60; // 초특급
    else if (grade.includes('S')) score += 50;
    else if (grade.includes('A')) score += 40;
    else if (grade.includes('B')) score += 20;

    // 2. 브랜드 티어 - 명품/매스티지 우대
    const tier = p.classification?.brandTier || 'OTHER';
    const tierScores: Record<string, number> = {
        'LUXURY': 50,
        'PREMIUM': 45,
        'HIGH': 40,
        'MIDDLE': 30,
        'LOW': 20,
        'OTHER': 10
    };
    score += tierScores[tier] || 10;

    // 3. 최신성 (업로드된지 얼마 안 된 상품)
    const daysSince = p.lifecycle?.daysSince || 0;
    score += Math.max(0, 50 - (daysSince * 2));

    // 4. 분류 신뢰도
    score += (p.classification?.confidence || 0) / 4;

    // 5. 온도/날씨 적합도 (추가)
    const type = p.classification?.clothingType || '';
    const subType = p.classification?.clothingSubType || '';

    // 온도별 추천 복장 가점 (최대 40점)
    if (currentTemp < 5) {
        // 한파: 패딩, 코트, 니트, 목도리
        if (type.includes('아우터') && (subType.includes('패딩') || subType.includes('코트'))) score += 40;
        if (type.includes('상의') && subType.includes('니트')) score += 20;
    } else if (currentTemp < 12) {
        // 추운 날씨: 자켓, 코트, 가디건
        if (type.includes('아우터')) score += 40;
        if (type.includes('상의') && (subType.includes('니트') || subType.includes('맨투맨'))) score += 20;
    } else if (currentTemp < 20) {
        // 간절기: 자켓, 가디건, 긴팔
        if (type.includes('아우터') && !subType.includes('패딩') && !subType.includes('코트')) score += 40;
        if (type.includes('상의') && (subType.includes('셔츠') || subType.includes('긴팔'))) score += 30;
    } else if (currentTemp < 28) {
        // 따뜻한 날씨: 반팔, 얇은 셔츠
        if (type.includes('상의') && (subType.includes('반팔') || subType.includes('티셔츠'))) score += 40;
        if (type.includes('하의') && subType.includes('반바지')) score += 20;
        if (type.includes('아우터')) score -= 20; // 아우터 감점
    } else {
        // 무더운 날씨: 민소매, 반바지, 린넨
        if (subType.includes('반팔') || subType.includes('반바지') || subType.includes('린넨')) score += 40;
        if (type.includes('아우터')) score -= 40; // 아우터 강한 감점
    }

    return score;
}
