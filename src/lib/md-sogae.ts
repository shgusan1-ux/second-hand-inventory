/**
 * MD-SOGAE v2.9 Protocol
 * 대한민국 최고의 패션 아카이브 전문가 및 자산 평가사 시스템
 * 
 * 목적: 데이터(품번, 실거래가)에 기반한 객관적인 상품 가치 입증 및 최적의 판매 효율 달성
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ============================================
// Phase 1: Visual & OCR Priority (데이터 채굴)
// ============================================

export interface CareLabel {
    productCode: string;      // Art No., Style No., RN 등
    fabricComposition: string; // 소재 혼용률 (예: Nylon 100%)
    brand: string;            // 메인 브랜드
    subLine: string;          // 세부 라인 (예: Prada Sport, Shadow Project)
    size: string;             // 사이즈 정보
    madeIn: string;           // 원산지
    grade: 'S' | 'A' | 'B';   // 등급 (썸네일에서 인식)
}

/**
 * Phase 1: 케어라벨 스캔 및 메타데이터 추출
 */
export async function extractCareLabelData(imageUrl: string): Promise<CareLabel> {
    try {
        const prompt = `
당신은 패션 아카이브 전문가입니다. 이미지에서 케어라벨(care label)을 정밀하게 스캔하여 다음 정보를 추출하세요.

**최우선 추출 항목:**
1. Product Code (품번): Art No., Style No., RN 뒤의 숫자, 모델번호 등
2. Fabric Composition (소재): % 기호 앞의 텍스트 (예: Nylon 100%, Cotton 80% Polyester 20%)
3. Brand/Line: 로고 자수나 라벨을 통한 브랜드 및 세부 라인 식별
   - 예: Prada Sport, Stone Island Shadow Project, Nike ACG
4. Size: 사이즈 표기 (S, M, L, 95, 100 등)
5. Made In: 원산지 (Made in Italy, Made in Korea 등)
6. Grade: 썸네일에 기재된 등급 (S, A, B) - 단, 상품 제목에는 중복 기재하지 않음

**OCR 정확도 우선순위:**
- 흰색 라벨의 검은 텍스트를 최우선으로 읽기
- 숫자와 대문자 조합(품번)에 집중
- % 기호 주변 텍스트 정확히 추출

다음 JSON 형식으로만 답변하세요:
{
  "productCode": "...",
  "fabricComposition": "...",
  "brand": "...",
  "subLine": "...",
  "size": "...",
  "madeIn": "...",
  "grade": "S" | "A" | "B"
}
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: await fetchImageAsBase64(imageUrl)
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('AI 응답 실패');
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            productCode: result.productCode || '',
            fabricComposition: result.fabricComposition || '',
            brand: result.brand || '',
            subLine: result.subLine || '',
            size: result.size || '',
            madeIn: result.madeIn || '',
            grade: result.grade || 'A'
        };
    } catch (error) {
        console.error('Care label extraction error:', error);
        return {
            productCode: '',
            fabricComposition: '',
            brand: '',
            subLine: '',
            size: '',
            madeIn: '',
            grade: 'A'
        };
    }
}

// ============================================
// Phase 2: Market Intelligence (가격 산출)
// ============================================

export interface MarketPrice {
    globalAverage: number;      // 글로벌 평균 (eBay + Grailed)
    kreamPrice: number;         // KREAM 실거래가
    usedPrice: number;          // 무신사 USED 판매가
    bunjangPrice: number;       // 번개장터 호가
    fruitsPrice: number;        // 후르츠패밀리 리스팅가
    finalPrice: number;         // 최종 추천가 (즉시 판매 가능가)
    priceReason: string;        // 가격 산출 근거
    dataSource: string[];       // 사용된 데이터 소스
}

/**
 * Phase 2: 글로벌 + 국내 시장 가격 분석
 * 관세 가중치(1.18x)는 일절 적용하지 않음
 */
export async function analyzeMarketPrice(productCode: string, brand: string, category: string): Promise<MarketPrice> {
    try {
        const prompt = `
당신은 패션 아카이브 자산 평가사입니다. 다음 상품의 실거래가를 분석하세요.

**상품 정보:**
- 품번: ${productCode}
- 브랜드: ${brand}
- 카테고리: ${category}

**가격 조사 플랫폼 (우선순위):**
1. **글로벌 인덱스 (Global Anchor):**
   - eBay Sold Listings (실제 판매 완료가)
   - Grailed Sold Items (실제 거래가)
   - 관세 가중치(1.18x) 절대 적용 금지 - 순수 해외 실거래가만 사용
   - KRW 환산 시 현재 환율 적용

2. **국내 시장 스캔 (Local Real):**
   - KREAM: 실거래 체결가 (가장 강력한 기준점)
   - 무신사 USED: 유사 등급 판매가 (상업적 표준)
   - 번개장터: 실시간 매물 호가 (시장 수요 확인)
   - 후르츠패밀리: 전문 셀러 리스팅가 (프리미엄 가치)

**최종 가격 결정 로직:**
- 글로벌 시세와 국내 4대 플랫폼 평균치를 교차 검증
- '즉시 판매 가능가' 산출 (너무 높지도 낮지도 않은 합리적 가격)

다음 JSON 형식으로 답변하세요:
{
  "globalAverage": 150000,
  "kreamPrice": 180000,
  "usedPrice": 160000,
  "bunjangPrice": 140000,
  "fruitsPrice": 200000,
  "finalPrice": 165000,
  "priceReason": "KREAM 실거래가와 글로벌 평균을 기준으로 산출. 국내 시장 수요가 높아 글로벌 대비 10% 프리미엄 적용.",
  "dataSource": ["eBay", "KREAM", "무신사 USED"]
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            globalAverage: result.globalAverage || 0,
            kreamPrice: result.kreamPrice || 0,
            usedPrice: result.usedPrice || 0,
            bunjangPrice: result.bunjangPrice || 0,
            fruitsPrice: result.fruitsPrice || 0,
            finalPrice: result.finalPrice || 0,
            priceReason: result.priceReason || '시장 데이터 부족',
            dataSource: result.dataSource || []
        };
    } catch (error) {
        console.error('Market price analysis error:', error);
        return {
            globalAverage: 0,
            kreamPrice: 0,
            usedPrice: 0,
            bunjangPrice: 0,
            fruitsPrice: 0,
            finalPrice: 0,
            priceReason: '가격 데이터 수집 실패',
            dataSource: []
        };
    }
}

// ============================================
// Phase 3: Professional Naming (50자 이내)
// ============================================

export interface ProfessionalName {
    fullName: string;           // 완성된 상품명 (50자 이내)
    tag: string;                // 전문 태그 ([Technical], [Archive], [Sartorial], [Original])
    brand: string;              // 브랜드
    yearModel: string;          // 연식+모델명
    feature: string;            // 특징/핏
    genderSize: string;         // 성별-사이즈 (예: MAN-L, WOMAN-M)
}

/**
 * Phase 3: SEO 최적화 전문 작명
 * 구조: [전문태그] 브랜드 연식+모델명 (특징/핏) 성별-사이즈
 */
export async function generateProfessionalName(
    brand: string,
    category: string,
    productCode: string,
    fabric: string,
    size: string
): Promise<ProfessionalName> {
    try {
        const prompt = `
당신은 오픈마켓 SEO 전문가입니다. 다음 상품의 전문적인 이름을 생성하세요.

**상품 정보:**
- 브랜드: ${brand}
- 카테고리: ${category}
- 품번: ${productCode}
- 소재: ${fabric}
- 사이즈: ${size}

**작명 규칙:**
1. **구조:** [전문태그] 브랜드 연식+모델명 (특징/핏) 성별-사이즈
2. **전문 태그 가이드 (주관적 형용사 금지):**
   - [Technical]: 기능성 소재(나일론 등) 중심
   - [Archive]: 역사적 가치가 있는 빈티지/명작
   - [Sartorial]: 테일러링/코트류
   - [Original]: 브랜드 시그니처 모델
3. **성별-사이즈 규칙:** MAN-L, WOMAN-M, KIDS-150, UNISEX-F (하이픈 결합 필수)
4. **제약:** 공백 포함 최대 45자 엄수

**예시:**
- [Technical] Stone Island 23FW Shadow Project 고어텍스 재킷 MAN-L
- [Archive] Helmut Lang 1998 본디지 카고팬츠 UNISEX-M
- [Sartorial] Prada 울 더블브레스트 코트 WOMAN-44

다음 JSON 형식으로 답변하세요:
{
  "fullName": "...",
  "tag": "[Technical]",
  "brand": "...",
  "yearModel": "...",
  "feature": "...",
  "genderSize": "MAN-L"
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            fullName: result.fullName || `${brand} ${category}`,
            tag: result.tag || '[Original]',
            brand: result.brand || brand,
            yearModel: result.yearModel || '',
            feature: result.feature || '',
            genderSize: result.genderSize || 'UNISEX-F'
        };
    } catch (error) {
        console.error('Professional naming error:', error);
        return {
            fullName: `${brand} ${category}`,
            tag: '[Original]',
            brand: brand,
            yearModel: '',
            feature: '',
            genderSize: 'UNISEX-F'
        };
    }
}

// ============================================
// Phase 4: Verification & Editorial
// ============================================

export interface MetadataCard {
    extractedCode: string;      // 추출 품번
    detectedFabric: string;     // 판별 소재
    calculatedPrice: number;    // 산출 가격
    suggestedName: string;      // 추천 제목
}

export interface EditorialContent {
    brandHeritage: string;      // 브랜드 헤리티지
    detailGuide: string;        // 디테일 가이드
    archiveValue: string;       // 아카이브 가치
}

/**
 * Phase 4: 전문가적 상세페이지 생성
 */
export async function generateEditorialContent(
    brand: string,
    productCode: string,
    fabric: string,
    marketPrice: MarketPrice
): Promise<EditorialContent> {
    try {
        const prompt = `
당신은 패션 아카이브 MD 전문가입니다. 다음 상품의 전문적인 상세 설명을 작성하세요.

**상품 정보:**
- 브랜드: ${brand}
- 품번: ${productCode}
- 소재: ${fabric}
- 시장 가격: ${marketPrice.finalPrice.toLocaleString()}원
- 가격 근거: ${marketPrice.priceReason}

**3가지 섹션 작성:**

1. **Brand Heritage (브랜드 헤리티지):**
   - 모델의 역사적 맥락
   - 브랜드의 철학과 이 제품의 위치
   - 2-3문장

2. **Detail Guide (디테일 가이드):**
   - 소재의 특성과 장점 (착용감, 관리법)
   - 부자재 분석 (지퍼, 단추, 스티치 등)
   - 전문가적 관점의 품질 평가
   - 3-4문장

3. **Archive Value (아카이브 가치):**
   - 국내외 시세 데이터 기반 구매 당위성
   - 투자 가치 또는 희소성
   - 2-3문장

**톤앤매너:**
- 전문적이면서도 접근 가능한 언어
- 데이터 기반의 객관적 서술
- 감성적 과장 금지

다음 JSON 형식으로 답변하세요:
{
  "brandHeritage": "...",
  "detailGuide": "...",
  "archiveValue": "..."
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            brandHeritage: result.brandHeritage || '',
            detailGuide: result.detailGuide || '',
            archiveValue: result.archiveValue || ''
        };
    } catch (error) {
        console.error('Editorial content generation error:', error);
        return {
            brandHeritage: '',
            detailGuide: '',
            archiveValue: ''
        };
    }
}

// ============================================
// 통합 MD-SOGAE 분석
// ============================================

export interface MDSogaeResult {
    // Phase 1: Visual & OCR
    careLabel: CareLabel;

    // Phase 2: Market Intelligence
    marketPrice: MarketPrice;

    // Phase 3: Professional Naming
    professionalName: ProfessionalName;

    // Phase 4: Editorial
    metadataCard: MetadataCard;
    editorial: EditorialContent;
}

/**
 * MD-SOGAE v2.9 통합 분석
 */
export async function analyzeMDSogae(imageUrl: string, category: string): Promise<MDSogaeResult> {
    console.log('🛡️ MD-SOGAE v2.9 분석 시작...');

    // Phase 1: 케어라벨 스캔
    console.log('📋 Phase 1: Visual & OCR Priority...');
    const careLabel = await extractCareLabelData(imageUrl);

    // Phase 2: 시장 가격 분석
    console.log('💰 Phase 2: Market Intelligence...');
    const marketPrice = await analyzeMarketPrice(
        careLabel.productCode,
        careLabel.brand,
        category
    );

    // Phase 3: 전문 작명
    console.log('✍️ Phase 3: Professional Naming...');
    const professionalName = await generateProfessionalName(
        careLabel.brand,
        category,
        careLabel.productCode,
        careLabel.fabricComposition,
        careLabel.size
    );

    // Phase 4: 에디토리얼 콘텐츠
    console.log('📝 Phase 4: Editorial Content...');
    const editorial = await generateEditorialContent(
        careLabel.brand,
        careLabel.productCode,
        careLabel.fabricComposition,
        marketPrice
    );

    // 메타데이터 카드 생성
    const metadataCard: MetadataCard = {
        extractedCode: careLabel.productCode,
        detectedFabric: careLabel.fabricComposition,
        calculatedPrice: marketPrice.finalPrice,
        suggestedName: professionalName.fullName
    };

    console.log('✅ MD-SOGAE v2.9 분석 완료!');

    return {
        careLabel,
        marketPrice,
        professionalName,
        metadataCard,
        editorial
    };
}

// ============================================
// Helper Functions
// ============================================

async function fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}
