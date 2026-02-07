/**
 * ARCHIVE 자동 분류 시스템
 * 
 * 상품명과 브랜드를 분석하여 5가지 ARCHIVE 카테고리 중 하나로 분류
 * 
 * ARCHIVE 카테고리:
 * 1. MILITARY ARCHIVE - 군용/군납/군복 기반
 * 2. WORKWEAR ARCHIVE - 작업복/노동복 기반
 * 3. JAPAN ARCHIVE - 일본 브랜드/감성
 * 4. HERITAGE ARCHIVE - 브랜드 역사성/클래식
 * 5. BRITISH ARCHIVE - 영국 브랜드/전통 스타일
 */

export type ArchiveCategory =
    | 'MILITARY ARCHIVE'
    | 'WORKWEAR ARCHIVE'
    | 'JAPAN ARCHIVE'
    | 'HERITAGE ARCHIVE'
    | 'BRITISH ARCHIVE'
    | null; // null = ARCHIVE가 아님

interface ClassificationResult {
    category: ArchiveCategory;
    confidence: number; // 0-100
    reason: string;
}

// 키워드 기반 분류 규칙
const CLASSIFICATION_RULES = {
    MILITARY: {
        keywords: [
            // 군복 종류
            'M-65', 'M65', 'BDU', 'MA-1', 'MA1', 'N-3B', 'N3B', 'CWU',
            'FIELD JACKET', '필드자켓', '필드 자켓',
            'MILITARY', '밀리터리', '군복', '군용', '군납',
            'CARGO', '카고', 'CAMO', '카모', 'CAMOUFLAGE',
            'FATIGUE', '피티그', 'COMBAT', '컴뱃',
            'ARMY', 'NAVY', 'AIR FORCE', 'USMC', 'USAF',
            // 밀리터리 브랜드
            'ALPHA', 'ROTHCO', 'PROPPER', 'TRU-SPEC',
        ],
        brands: ['ALPHA', 'ROTHCO', 'PROPPER', 'TRU-SPEC', 'BUZZ RICKSON'],
    },
    WORKWEAR: {
        keywords: [
            // 워크웨어 아이템
            'CHORE', '초어', 'COVERALL', '커버올',
            'PAINTER', '페인터', 'DUNGAREE', '던가리',
            'WORK', '워크', 'WORKWEAR', '작업복',
            'DOUBLE KNEE', '더블니',
            // 워크웨어 브랜드
            'CARHARTT', '칼하트', 'DICKIES', '딕키즈',
            'RED KAP', 'REDKAP', 'BEN DAVIS', 'BENDAVIS',
            'POINTER', 'ROUND HOUSE', 'KEY',
        ],
        brands: ['CARHARTT', 'DICKIES', 'RED KAP', 'BEN DAVIS', 'POINTER', 'KEY'],
    },
    JAPAN: {
        keywords: [
            // 일본 브랜드
            'BEAMS', '빔스', 'UNITED ARROWS', '유나이티드 애로우',
            'COMME DES GARCONS', 'CDG', '꼼데가르송',
            'KAPITAL', '캐피탈', 'VISVIM', '비스빔',
            'NEIGHBORHOOD', '네이버후드', 'WTAPS', '더블탭스',
            'NANAMICA', '나나미카', 'ENGINEERED GARMENTS', 'EG',
            'PORTER', '포터', 'MASTER-PIECE', '마스터피스',
            'UNIQLO', '유니클로', 'MUJI', '무인양품',
            // 일본 감성 키워드
            'BORO', '보로', 'SASHIKO', '사시코',
            'INDIGO', '인디고', 'SELVEDGE', '셀비지',
        ],
        brands: [
            'BEAMS', 'UNITED ARROWS', 'COMME DES GARCONS', 'KAPITAL',
            'VISVIM', 'NEIGHBORHOOD', 'WTAPS', 'NANAMICA',
            'ENGINEERED GARMENTS', 'PORTER', 'UNIQLO', 'MUJI',
        ],
    },
    HERITAGE: {
        keywords: [
            // 헤리티지 키워드
            'HERITAGE', '헤리티지', 'VINTAGE', '빈티지',
            'CLASSIC', '클래식', 'TRADITIONAL', '트래디셔널',
            'IVY', '아이비', 'PREPPY', '프레피',
            'OXFORD', '옥스포드', 'TWEED', '트위드',
            'HARRIS TWEED', '해리스 트위드',
            'OLD LOGO', '올드로고', 'ARCHIVE',
            // 헤리티지 브랜드
            'RALPH LAUREN', '랄프로렌', 'POLO', '폴로',
            'BROOKS BROTHERS', '브룩스브라더스',
            'J.PRESS', 'J PRESS', 'GANT', '간트',
            'LACOSTE', '라코스테', 'FRED PERRY', '프레드페리',
            'LL BEAN', 'LLBEAN', 'EDDIE BAUER', '에디바우어',
            'PENDLETON', '펜들턴', 'WOOLRICH', '울리치',
        ],
        brands: [
            'RALPH LAUREN', 'POLO', 'BROOKS BROTHERS', 'J.PRESS',
            'GANT', 'LACOSTE', 'FRED PERRY', 'LL BEAN', 'EDDIE BAUER',
            'PENDLETON', 'WOOLRICH',
        ],
    },
    BRITISH: {
        keywords: [
            // 영국 브랜드
            'BARBOUR', '바버', 'BURBERRY', '버버리',
            'AQUASCUTUM', '아쿠아스큐텀',
            'GLOVERALL', '글로버올', 'DUFFLE', '더플',
            'MACKINTOSH', '맥킨토시',
            'FRED PERRY', '프레드페리',
            'BARACUTA', '바라쿠타', 'HARRINGTON',
            'DR. MARTENS', '닥터마틴', 'CLARKS', '클락스',
            // 영국 스타일
            'BRITISH', '브리티시', 'ENGLAND', '잉글랜드',
            'LONDON', '런던', 'SCOTTISH', '스코티시',
            'TARTAN', '타탄', 'CHECK', '체크',
        ],
        brands: [
            'BARBOUR', 'BURBERRY', 'AQUASCUTUM', 'GLOVERALL',
            'MACKINTOSH', 'FRED PERRY', 'BARACUTA',
            'DR. MARTENS', 'CLARKS',
        ],
    },
};

/**
 * 상품명과 브랜드를 분석하여 ARCHIVE 카테고리 분류
 */
export function classifyArchive(productName: string, brand: string = ''): ClassificationResult {
    const text = `${productName} ${brand}`.toUpperCase();

    const scores = {
        'MILITARY ARCHIVE': 0,
        'WORKWEAR ARCHIVE': 0,
        'JAPAN ARCHIVE': 0,
        'HERITAGE ARCHIVE': 0,
        'BRITISH ARCHIVE': 0,
    };

    const reasons: string[] = [];

    // 1. 브랜드 기반 분류 (가중치 높음)
    const brandUpper = brand.toUpperCase();

    if (CLASSIFICATION_RULES.MILITARY.brands.some(b => brandUpper.includes(b))) {
        scores['MILITARY ARCHIVE'] += 50;
        reasons.push('밀리터리 브랜드');
    }
    if (CLASSIFICATION_RULES.WORKWEAR.brands.some(b => brandUpper.includes(b))) {
        scores['WORKWEAR ARCHIVE'] += 50;
        reasons.push('워크웨어 브랜드');
    }
    if (CLASSIFICATION_RULES.JAPAN.brands.some(b => brandUpper.includes(b))) {
        scores['JAPAN ARCHIVE'] += 50;
        reasons.push('일본 브랜드');
    }
    if (CLASSIFICATION_RULES.HERITAGE.brands.some(b => brandUpper.includes(b))) {
        scores['HERITAGE ARCHIVE'] += 50;
        reasons.push('헤리티지 브랜드');
    }
    if (CLASSIFICATION_RULES.BRITISH.brands.some(b => brandUpper.includes(b))) {
        scores['BRITISH ARCHIVE'] += 50;
        reasons.push('영국 브랜드');
    }

    // 2. 키워드 기반 분류
    for (const keyword of CLASSIFICATION_RULES.MILITARY.keywords) {
        if (text.includes(keyword.toUpperCase())) {
            scores['MILITARY ARCHIVE'] += 10;
            if (!reasons.includes('밀리터리 키워드')) reasons.push('밀리터리 키워드');
        }
    }
    for (const keyword of CLASSIFICATION_RULES.WORKWEAR.keywords) {
        if (text.includes(keyword.toUpperCase())) {
            scores['WORKWEAR ARCHIVE'] += 10;
            if (!reasons.includes('워크웨어 키워드')) reasons.push('워크웨어 키워드');
        }
    }
    for (const keyword of CLASSIFICATION_RULES.JAPAN.keywords) {
        if (text.includes(keyword.toUpperCase())) {
            scores['JAPAN ARCHIVE'] += 10;
            if (!reasons.includes('일본 키워드')) reasons.push('일본 키워드');
        }
    }
    for (const keyword of CLASSIFICATION_RULES.HERITAGE.keywords) {
        if (text.includes(keyword.toUpperCase())) {
            scores['HERITAGE ARCHIVE'] += 10;
            if (!reasons.includes('헤리티지 키워드')) reasons.push('헤리티지 키워드');
        }
    }
    for (const keyword of CLASSIFICATION_RULES.BRITISH.keywords) {
        if (text.includes(keyword.toUpperCase())) {
            scores['BRITISH ARCHIVE'] += 10;
            if (!reasons.includes('영국 키워드')) reasons.push('영국 키워드');
        }
    }

    // 3. 최고 점수 카테고리 선택
    let maxScore = 0;
    let selectedCategory: ArchiveCategory = null;

    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            selectedCategory = category as ArchiveCategory;
        }
    }

    // 점수가 너무 낮으면 ARCHIVE가 아님
    if (maxScore < 10) {
        return {
            category: null,
            confidence: 0,
            reason: 'ARCHIVE 카테고리 기준에 미달',
        };
    }

    return {
        category: selectedCategory,
        confidence: Math.min(100, maxScore),
        reason: reasons.join(', '),
    };
}

/**
 * 대량 상품 분류
 */
export function classifyBulkArchive(products: Array<{ id: string; name: string; brand: string }>) {
    return products.map(product => {
        const result = classifyArchive(product.name, product.brand);
        return {
            productId: product.id,
            category: result.category,
            confidence: result.confidence,
            reason: result.reason,
        };
    });
}
