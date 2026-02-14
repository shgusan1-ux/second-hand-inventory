/**
 * ARCHIVE 자동 분류 시스템 v2.0
 *
 * 7가지 ARCHIVE 카테고리로 분류
 * - 주요 분류는 ai-archive-engine.ts (Gemini 3 Pro + Google Search Grounding)가 담당
 * - 이 파일은 키워드 기반 보조 분류기 (빠른 사전 분류용)
 *
 * ARCHIVE 카테고리:
 * 1. MILITARY ARCHIVE - 군용/군납/군복 기반
 * 2. WORKWEAR ARCHIVE - 작업복/노동복 기반
 * 3. OUTDOOR ARCHIVE - 아웃도어/등산/기능성
 * 4. JAPANESE ARCHIVE - 일본 브랜드/아메카지 감성
 * 5. HERITAGE EUROPE - 유럽 헤리티지/클래식/럭셔리
 * 6. BRITISH ARCHIVE - 영국 전통 스타일
 * 7. UNISEX ARCHIVE - 유니섹스/젠더리스
 */

export type ArchiveCategory =
    | 'MILITARY ARCHIVE'
    | 'WORKWEAR ARCHIVE'
    | 'OUTDOOR ARCHIVE'
    | 'JAPANESE ARCHIVE'
    | 'HERITAGE EUROPE'
    | 'BRITISH ARCHIVE'
    | 'UNISEX ARCHIVE'
    | null; // null = 분류 불가

interface ClassificationResult {
    category: ArchiveCategory;
    confidence: number; // 0-100
    reason: string;
}

// 키워드 기반 분류 규칙
const CLASSIFICATION_RULES = {
    MILITARY: {
        keywords: [
            'M-65', 'M65', 'BDU', 'MA-1', 'MA1', 'N-3B', 'N3B', 'CWU',
            'FIELD JACKET', '필드자켓', '필드 자켓',
            'MILITARY', '밀리터리', '군복', '군용', '군납',
            'CARGO', '카고', 'CAMO', '카모', 'CAMOUFLAGE',
            'FATIGUE', '피티그', 'COMBAT', '컴뱃',
            'ARMY', 'NAVY', 'AIR FORCE', 'USMC', 'USAF',
            'ALPHA', 'ROTHCO', 'PROPPER', 'TRU-SPEC',
            'DECK JACKET', '덱재킷', 'TANKER', '야상',
        ],
        brands: ['ALPHA', 'ROTHCO', 'PROPPER', 'TRU-SPEC', 'BUZZ RICKSON'],
    },
    WORKWEAR: {
        keywords: [
            'CHORE', '초어', 'COVERALL', '커버올',
            'PAINTER', '페인터', 'DUNGAREE', '던가리',
            'WORK', '워크', 'WORKWEAR', '작업복',
            'DOUBLE KNEE', '더블니', 'OVERALL', '오버올',
            'CARHARTT', '칼하트', 'DICKIES', '딕키즈',
            'RED KAP', 'REDKAP', 'BEN DAVIS', 'BENDAVIS',
            'POINTER', 'ROUND HOUSE', 'KEY', 'STAN RAY',
            'HICKORY', '히코리', 'DUCK', '덕캔버스',
        ],
        brands: ['CARHARTT', 'DICKIES', 'RED KAP', 'BEN DAVIS', 'POINTER', 'KEY', 'STAN RAY', 'FILSON'],
    },
    OUTDOOR: {
        keywords: [
            'GORE-TEX', 'GORETEX', '고어텍스',
            'FLEECE', '플리스', '후리스',
            'MOUNTAIN', '마운틴', 'PARKA', '파카',
            'ANORAK', '아노락', 'WIND', '윈드',
            'CAMPING', '캠핑', 'CLIMBING', '클라이밍',
            'RETRO X', '레트로X', 'NUPTSE', '눕시',
            'PATAGONIA', '파타고니아',
            'THE NORTH FACE', 'NORTH FACE', '노스페이스',
            'ARC TERYX', 'ARCTERYX', '아크테릭스',
            'COLUMBIA', '컬럼비아',
            'L.L.BEAN', 'LLBEAN', '엘엘빈',
            'EDDIE BAUER', '에디바우어',
            'MAMMUT', '마무트', 'MARMOT', '마모트',
        ],
        brands: [
            'PATAGONIA', 'THE NORTH FACE', 'NORTH FACE', 'ARC TERYX',
            'COLUMBIA', 'L.L.BEAN', 'EDDIE BAUER',
            'MAMMUT', 'MARMOT', 'HELLY HANSEN', 'SIERRA DESIGNS',
        ]
    },
    JAPAN: {
        keywords: [
            'BEAMS', '빔스', 'UNITED ARROWS', '유나이티드 애로우',
            'COMME DES GARCONS', 'CDG', '꼼데가르송',
            'KAPITAL', '캐피탈', 'VISVIM', '비스빔',
            'NEIGHBORHOOD', '네이버후드', 'WTAPS', '더블탭스',
            'NANAMICA', '나나미카', 'ENGINEERED GARMENTS', 'EG',
            'PORTER', '포터', 'NEEDLES', '니들스',
            'UNIQLO', '유니클로', 'MUJI', '무인양품',
            'SACAI', '사카이', 'UNDERCOVER', '언더커버',
            'BORO', '보로', 'SASHIKO', '사시코',
            'INDIGO', '인디고', 'SELVEDGE', '셀비지',
            '아메카지', 'ISSEY MIYAKE', '이세이미야케',
        ],
        brands: [
            'BEAMS', 'UNITED ARROWS', 'COMME DES GARCONS', 'KAPITAL',
            'VISVIM', 'NEIGHBORHOOD', 'WTAPS', 'NANAMICA',
            'ENGINEERED GARMENTS', 'NEEDLES', 'SACAI', 'UNDERCOVER',
        ],
    },
    HERITAGE: {
        keywords: [
            'HERITAGE', '헤리티지', 'VINTAGE', '빈티지',
            'CLASSIC', '클래식', 'TRADITIONAL', '트래디셔널',
            'IVY', '아이비', 'PREPPY', '프레피',
            'OXFORD', '옥스포드', 'TWEED', '트위드',
            'RALPH LAUREN', '랄프로렌', 'POLO', '폴로',
            'BROOKS BROTHERS', '브룩스브라더스',
            'J.PRESS', 'J PRESS', 'GANT', '간트',
            'LACOSTE', '라코스테',
            'TOMMY HILFIGER', '타미힐피거',
            'GUCCI', '구찌', 'PRADA', '프라다',
            'DIOR', '디올', 'CHANEL', '샤넬',
            'LOUIS VUITTON', '루이비통',
        ],
        brands: [
            'RALPH LAUREN', 'POLO', 'BROOKS BROTHERS', 'J.PRESS',
            'GANT', 'LACOSTE', 'TOMMY HILFIGER',
            'GUCCI', 'PRADA', 'LOUIS VUITTON', 'DIOR', 'CHANEL',
        ],
    },
    BRITISH: {
        keywords: [
            'BARBOUR', '바버', 'BURBERRY', '버버리',
            'AQUASCUTUM', '아쿠아스큐텀',
            'GLOVERALL', '글로버올', 'DUFFLE', '더플',
            'MACKINTOSH', '맥킨토시',
            'FRED PERRY', '프레드페리',
            'BARACUTA', '바라쿠타', 'HARRINGTON',
            'DR. MARTENS', '닥터마틴', 'CLARKS', '클락스',
            'PAUL SMITH', '폴스미스',
            'VIVIENNE WESTWOOD', '비비안웨스트우드',
            'BRITISH', '브리티시', 'ENGLAND', '잉글랜드',
            'LONDON', '런던', 'SCOTTISH', '스코티시',
            'TARTAN', '타탄', 'WAXED', '왁스',
        ],
        brands: [
            'BARBOUR', 'BURBERRY', 'AQUASCUTUM', 'GLOVERALL',
            'MACKINTOSH', 'FRED PERRY', 'BARACUTA',
            'PAUL SMITH', 'VIVIENNE WESTWOOD', 'NIGEL CABOURN',
        ],
    },
    UNISEX: {
        keywords: [
            '남녀공용', '유니섹스', 'UNISEX', '남녀', '공용',
            '프리사이즈', 'FREE SIZE', 'FREESIZE', 'ONE SIZE',
            '오버사이즈', 'OVERSIZE', '오버핏', 'OVERSIZED',
            '박시핏', 'BOXY', '젠더리스', 'GENDERLESS',
            '무지', 'BASIC', 'PLAIN',
            '노브랜드', 'NO BRAND',
        ],
        brands: [] as string[],
    },
};

/**
 * 상품명과 브랜드를 분석하여 ARCHIVE 카테고리 분류 (키워드 기반 보조 분류기)
 */
export function classifyArchiveLocal(
    productName: string,
    brand: string = '',
): ClassificationResult {
    const text = `${productName} ${brand}`.toUpperCase();

    const scores: Record<string, number> = {
        'MILITARY ARCHIVE': 0,
        'WORKWEAR ARCHIVE': 0,
        'OUTDOOR ARCHIVE': 0,
        'JAPANESE ARCHIVE': 0,
        'HERITAGE EUROPE': 0,
        'BRITISH ARCHIVE': 0,
        'UNISEX ARCHIVE': 0,
    };

    const reasons: string[] = [];
    const brandUpper = brand.toUpperCase();

    // 1. 브랜드 매칭
    const ruleMap: Record<string, string> = {
        'MILITARY': 'MILITARY ARCHIVE',
        'WORKWEAR': 'WORKWEAR ARCHIVE',
        'OUTDOOR': 'OUTDOOR ARCHIVE',
        'JAPAN': 'JAPANESE ARCHIVE',
        'HERITAGE': 'HERITAGE EUROPE',
        'BRITISH': 'BRITISH ARCHIVE',
        'UNISEX': 'UNISEX ARCHIVE',
    };

    for (const [ruleKey, catName] of Object.entries(ruleMap)) {
        const rule = CLASSIFICATION_RULES[ruleKey as keyof typeof CLASSIFICATION_RULES];
        if (rule.brands.some(b => brandUpper.includes(b))) {
            scores[catName] += 50;
            reasons.push(`${ruleKey.toLowerCase()} 브랜드`);
        }
    }

    // 2. 키워드 매칭
    for (const [ruleKey, catName] of Object.entries(ruleMap)) {
        const rule = CLASSIFICATION_RULES[ruleKey as keyof typeof CLASSIFICATION_RULES];
        for (const keyword of rule.keywords) {
            if (text.includes(keyword.toUpperCase())) {
                scores[catName] += 10;
                const label = `${ruleKey.toLowerCase()} 키워드`;
                if (!reasons.includes(label)) reasons.push(label);
            }
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

    if (maxScore < 10) {
        return { category: null, confidence: 0, reason: 'ARCHIVE 카테고리 기준에 미달' };
    }

    return {
        category: selectedCategory,
        confidence: Math.min(100, maxScore),
        reason: reasons.join(', '),
    };
}

/**
 * 대량 상품 분류 (키워드 기반, 동기 처리)
 */
export async function classifyBulkArchive(products: Array<{ id: string; name: string; brand: string }>, useAI = false) {
    const results = [];
    for (const product of products) {
        const result = classifyArchiveLocal(product.name, product.brand);
        results.push({
            productId: product.id,
            category: result.category,
            confidence: result.confidence,
            reason: result.reason,
        });
    }
    return results;
}

// 하위 호환: 기존 코드에서 classifyArchive로 import하는 경우
export { classifyArchiveLocal as classifyArchive };
