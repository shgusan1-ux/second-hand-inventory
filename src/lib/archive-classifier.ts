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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

/**
 * 상품명과 브랜드를 분석하여 ARCHIVE 카테고리 분류
 */
export async function classifyArchive(
    productName: string,
    brand: string = '',
    options: { useAI?: boolean; forceAI?: boolean } = {}
): Promise<ClassificationResult> {
    const text = `${productName} ${brand}`.toUpperCase();

    const scores: Record<string, number> = {
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

    // 4. AI 판정 (옵션이 켜져 있거나 확신도가 낮을 때)
    if (options.forceAI || (options.useAI && (maxScore < 40 || !selectedCategory))) {
        try {
            const aiResult = await classifyWithAI(productName, brand);
            if (aiResult.category) {
                return {
                    category: aiResult.category as ArchiveCategory,
                    confidence: aiResult.confidence,
                    reason: `AI 정밀 분석 (${aiResult.reason})`,
                };
            }
        } catch (e) {
            console.error('AI Classification failed:', e);
            // AI 실패 시 기존 점수 결과 사용
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
 * AI를 이용한 정밀 분류
 */
async function classifyWithAI(productName: string, brand: string): Promise<ClassificationResult> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');

    const prompt = `
당신은 빈티지 및 아카이브 의류 전문 감정사입니다. 상품명과 브랜드를 분석하여 아래 5가지 카테고리 중 가장 적합한 하나로 분류해주세요.

카테고리:
1. MILITARY ARCHIVE: 미군 등 군용 의류, 오리지널 군복, 밀리터리 복각 브랜드
2. WORKWEAR ARCHIVE: 칼하트, 디키즈, 프렌치 워크 등 노동복 기반 브랜드 및 아이템
3. JAPAN ARCHIVE: 비스빔, 캐피탈, 유나이티드 애로우 등 일본 고유의 감성이나 브랜드
4. HERITAGE ARCHIVE: 폴로 랄프로렌, 브룩스 브라더스 등 역사와 전통이 깊은 클래식/아이비 스타일
5. BRITISH ARCHIVE: 바버, 버버리, 맥킨토시 등 정통 영국 스타일 및 브랜드

상품명: ${productName}
브랜드: ${brand}

결과를 JSON 형식으로만 응답하세요:
{
  "category": "원하는 카테고리 명칭 (예: MILITARY ARCHIVE)",
  "confidence": 신뢰도 점수 (0-100),
  "reason": "분류 근거 (10자 내외)"
}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Gemini API error: ${data.error?.message || 'Unknown'}`);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return {
        category: result.category as ArchiveCategory,
        confidence: result.confidence || 0,
        reason: result.reason || 'AI 분석',
    };
}

/**
 * 대량 상품 분류
 */
export async function classifyBulkArchive(products: Array<{ id: string; name: string; brand: string }>, useAI = false) {
    const results = [];
    for (const product of products) {
        const result = await classifyArchive(product.name, product.brand, { useAI });
        results.push({
            productId: product.id,
            category: result.category,
            confidence: result.confidence,
            reason: result.reason,
        });
    }
    return results;
}
