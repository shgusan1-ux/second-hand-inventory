/**
 * AI 기반 자동화 시스템
 * 
 * 기능:
 * 1. 썸네일 자동화 - 이미지 크롭/리사이징
 * 2. 등급(GRADE) 자동 판정 - AI 비전 분석
 * 3. AI 기반 가격 추천 - 유사 상품 데이터 기반
 * 4. MD 상품소개 자동 생성 - GPT 기반
 * 5. 가상 피팅 - 나노바나나 스타일
 */

// Gemini API 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// MD코멘트 전용 고품질 모델 (Gemini 2.5 Flash)
const GEMINI_MD_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent';

// Replicate API 설정 (가상 피팅용)
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || '';

export interface AIAnalysisResult {
    grade: 'S급' | 'A급' | 'B급';
    gradeReason: string;
    suggestedPrice: number;
    priceReason: string;
    suggestedConsumerPrice: number;
    mdDescription: string;
    keywords: string[];
    confidence: number;
    // New fields
    suggestedName: string;
    suggestedBrand: string;
    suggestedSize: string;
    suggestedFabric: string;
    suggestedCategory: string;
    suggestedGender: string;
    vibe?: string;
    stylingTips?: string;
}

/**
 * 1. 이미지 종합 분석 (등급, 상품명, 브랜드, 사이즈, 원단)
 * 이미지를 분석하여 상품의 상세 정보를 추출합니다.
 */
export async function analyzeProductImage(imageUrl: string, currentName: string, labelImageUrls?: string[]): Promise<{
    grade: 'S급' | 'A급' | 'B급';
    reason: string;
    confidence: number;
    suggestedName: string;
    suggestedBrand: string;
    suggestedSize: string;
    suggestedFabric: string;
    suggestedCategory: string;
    suggestedGender: string;
    suggestedConsumerPrice: number;
    vibe: string;
    stylingTips: string;
}> {
    try {
        const hasLabels = labelImageUrls && labelImageUrls.length > 0;
        const prompt = `
당신은 세계 최고의 빈티지/중고 의류 전문 감정사입니다.
이미지를 정밀하게 분석하여 다음 정보를 JSON 형식으로 추출해주세요.

${hasLabels ? `★ 중요: 첫 번째 이미지는 상품 사진이고, 이후 이미지는 브랜드 라벨/세탁택(케어라벨) 사진입니다.
라벨/세탁택에서 반드시 다음을 읽어내세요:
- 브랜드명 (영문/일문/한글)
- 소재/원단 구성 (예: COTTON 100%, POLYESTER 65% COTTON 35%)
- 사이즈 표기
- 생산국
- 세탁 방법
이 정보를 suggestedFabric, suggestedBrand, suggestedSize에 정확히 반영하세요.
` : ''}
입력된 상품명 참고: ${currentName}

추출 항목:
1. grade: 상태 등급
   - S급 (새상품급): 사용감 없음, 오염/손상 없음
   - A급 (사용감 적음): 미세한 사용감, 상태 양호
   - B급 (사용감 있음): 눈에 띄는 사용감, 오염/손상 존재
2. reason: 등급 판정 근거 (구체적)
3. confidence: 신뢰도 (0-100)
4. suggestedName: 상품명 (45자 이내, SEO 최적화 필수)
   형식: "영문브랜드 한글브랜드 [핵심특징/디테일] [카테고리] 성별-사이즈"
   ★ 단순 나열 금지! 검색에 잡히는 핵심 키워드를 포함해야 함
   ★ 특징 예시: 색상, 패턴, 소재감, 핏, 연도/시즌, 로고 위치, 라인명, 길이(7부/크롭 등)
   ★ 바지 길이: 7부/크롭은 반드시 "7부"를 상품명에 포함. 반바지는 "1/2" 또는 "숏" 표기.
   좋은 예:
   - "NIKE 나이키 빈티지 스우시 자수 그레이 후드티 MAN-L"
   - "BURBERRY 버버리 노바체크 캐시미어 머플러 UNISEX-FREE"
   - "UNIQLO 유니클로 베이지 카고 7부 코튼 팬츠 MAN-M"
   - "POLO 폴로랄프로렌 스트라이프 옥스포드 BD셔츠 MAN-L"
   나쁜 예 (너무 단순):
   - "UNIQLO 유니클로 치노 팬츠 MAN-M" ← 특징이 없음, 색상/소재 없음
   - "NIKE 나이키 후드티 MAN-L" ← 색상/디테일 없음
   성별은 MAN/WOMAN/KIDS/UNISEX 중 하나, 사이즈는 라벨 표기 기준.
5. suggestedBrand: 브랜드명 (로고나 텍스트로 식별. 만약 식별이 불가능하거나 브랜드가 모호할(VARIOUS 등) 경우, 옷의 분위기에 맞춰 "JAPAN ARCHIVE", "EUROPEAN VINTAGE", "US VINTAGE", "VINTAGE SELECTION", "PARIS ARCHIVE", "TOKYO SELECTION" 등 매력적인 가상의 아카이브 명칭 중 하나를 선정하세요. 절대 "VARIOUS", "Generic", "Unknown", "공란"으로 적지 마세요.)
6. suggestedSize: 사이즈 - **반드시 아래 규칙 준수**
   ★ 최우선: 라벨/태그에 적힌 표기 그대로 사용 (예: "L", "M", "95", "100")
   ★ 라벨이 안 보이면: 상품명에 이미 포함된 사이즈 표기 그대로 사용
   ★ 실측 치수(허리, 어깨 등)로 사이즈를 추측하지 마세요! 실측은 참고만.

   [한국 남성 의류 사이즈 기준 - 절대로 실측으로 업사이징 금지]
   - 밴딩(고무줄) 바지: 허리 실측은 늘어나기 전 치수이므로 실제 착용 사이즈보다 작게 나옴
     → 28~29인치 실측 = M, 30~31인치 실측 = L, 32~33인치 실측 = XL
     → 밴딩 바지 허리 30인치는 L이지 XXL이 아님!
   - 일반 바지: 허리 30=M, 32=L, 34=XL, 36=XXL
   - 상의: 95=M, 100=L, 105=XL, 110=XXL (한국식)
   - 유럽/미국/영국 사이즈가 표기되어 있으면 그 표기를 한국식으로 변환하여 표기

   ★ 식별 불가시 공란

7. suggestedFabric: 원단/소재 (라벨/세탁택에 일본어(綿, 毛 등)나 한자가 있을 경우 반드시 한국어(면, 모 등)로 번역하여 기재하세요. 예: "綿 100%" → "면 100%", "毛 100%" → "모 100%". 소재 구성을 정확히 기재하세요. 예: "면 100%", "폴리에스터 65% 면 35%", "울 80% 나일론 20%")
8. suggestedCategory: 카테고리 (다음 중 하나: 코트, 재킷, 블레이저, 패딩, 사파리, 아우터, 셔츠, 데님셔츠, 블라우스, 니트, 가디건, 니트/가디건, 맨투맨, 맨투맨/후드맨투맨, 후드/맨투맨, 후드집업/후리스, 티셔츠, 반팔 티셔츠, 1/2 티셔츠, 1/2 셔츠, 원피스, 스커트, 팬츠, 데님팬츠, 1/2 팬츠, 스포츠, 가방, 모자, 신발, 머플러,스카프,행거치프, 넥타이, 벨트 및 기타, 양말, 타월, 악세사리)
9. suggestedGender: 성별 판별 (MAN / WOMAN / KIDS / UNISEX 중 하나. 옷의 디자인, 핏, 라벨 표기 등으로 판별)
10. suggestedConsumerPrice: 소비자가 추천 (새제품 정가의 약 70% 가격을 추천. 브랜드와 카테고리를 고려하여 이 상품이 새것일 때의 정상판매가를 추정하고, 그것의 70%를 원 단위로 반올림하여 제시. 예: 새제품 정가 100,000원이면 소비자가 70,000원)

다음 JSON 형식으로만 답변하세요:
{
  "grade": "S급" | "A급" | "B급",
  "reason": "...",
  "confidence": 85,
  "suggestedName": "...",
  "suggestedBrand": "...",
  "suggestedSize": "...",
  "suggestedFabric": "...",
  "suggestedCategory": "...",
  "suggestedGender": "MAN",
  "suggestedConsumerPrice": 70000
}
`;

        // 이미지 parts 구성: 상품 사진 + label 이미지들
        const imageParts: any[] = [
            {
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: await fetchImageAsBase64(imageUrl)
                }
            }
        ];

        // label 이미지 추가 (브랜드택, 세탁택)
        if (hasLabels) {
            for (const labelUrl of labelImageUrls!) {
                try {
                    const labelB64 = await fetchImageAsBase64(labelUrl);
                    imageParts.push({
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: labelB64
                        }
                    });
                } catch (labelErr) {
                    console.warn('Label 이미지 로드 실패:', labelUrl, labelErr);
                }
            }
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        ...imageParts
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.error('Gemini API error:', data);
            throw new Error('AI 응답 실패');
        }

        const text = data.candidates[0].content.parts[0].text;
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            grade: result.grade || 'A급',
            reason: result.reason || '',
            confidence: result.confidence || 0,
            suggestedName: result.suggestedName || currentName,
            suggestedBrand: result.suggestedBrand || '',
            suggestedSize: result.suggestedSize || '',
            suggestedFabric: result.suggestedFabric || '',
            suggestedCategory: result.suggestedCategory || '',
            suggestedGender: result.suggestedGender || '',
            suggestedConsumerPrice: result.suggestedConsumerPrice || 0,
            vibe: result.vibe || '',
            stylingTips: result.stylingTips || '',
        };
    } catch (error) {
        console.error('Image analysis error:', error);
        return {
            grade: 'A급',
            reason: '자동 판정 실패 - 수동 확인 필요',
            confidence: 0,
            suggestedName: currentName,
            suggestedBrand: '',
            suggestedSize: '',
            suggestedFabric: '',
            suggestedCategory: '',
            suggestedGender: '',
            suggestedConsumerPrice: 0,
            vibe: '',
            stylingTips: '',
        };
    }
}

/**
 * 2. AI 기반 가격 추천
 * 유사 상품 데이터와 시장 가격을 분석하여 최적 가격 추천
 */
export async function suggestPrice(product: {
    name: string;
    brand: string;
    category: string;
    condition: string;
    price_consumer?: number;
}): Promise<{
    suggestedPrice: number;
    reason: string;
    priceRange: { min: number; max: number };
}> {
    try {
        // 1. 유사 상품 찾기 (같은 브랜드 + 카테고리)
        let soldPrices: number[] = [];

        try {
            const { db } = await import('./db');
            const result = await db.query(`
                SELECT price_sell, price_consumer, condition,
                       status
                FROM products
                WHERE brand = $1
                    AND category = $2
                    AND status = '판매완료'
                ORDER BY created_at DESC
                LIMIT 20
            `, [product.brand, product.category]);
            soldPrices = result.rows.map((p: any) => p.price_sell).filter((p: number) => p > 0);
        } catch (dbError) {
            console.log('Database query failed, using fallback pricing');
        }

        // 2. 통계 계산 (아카이브/큐레이티드 할인 여유 반영하여 초기 판매가를 넉넉하게 설정)
        const avgPrice = soldPrices.length > 0
            ? soldPrices.reduce((a: number, b: number) => a + b, 0) / soldPrices.length
            : (product.price_consumer || 50000) * 0.5;

        const minPrice = soldPrices.length > 0 ? Math.min(...soldPrices) : avgPrice * 0.8;
        const maxPrice = soldPrices.length > 0 ? Math.max(...soldPrices) : avgPrice * 1.4;

        // 3. 등급 보정 (향후 할인 단계 고려하여 초기가 여유있게)
        let gradeMultiplier = 1.15;
        if (product.condition === 'S급') gradeMultiplier = 1.35;
        else if (product.condition === 'B급') gradeMultiplier = 0.95;

        const suggestedPrice = Math.round(avgPrice * gradeMultiplier / 1000) * 1000;

        // 4. GPT로 가격 근거 생성
        const prompt = `
브랜드: ${product.brand}
카테고리: ${product.category}
등급: ${product.condition}
유사 상품 평균가: ${Math.round(avgPrice).toLocaleString()}원
추천 가격: ${suggestedPrice.toLocaleString()}원

위 정보를 바탕으로 이 가격을 추천하는 이유를 1-2문장으로 설명해주세요.
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const reason = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '시장 평균가 기준 추천';

        return {
            suggestedPrice,
            reason,
            priceRange: { min: Math.round(minPrice), max: Math.round(maxPrice) }
        };
    } catch (error) {
        console.error('Price suggestion error:', error);
        const fallbackPrice = (product.price_consumer || 50000) * 0.5;
        return {
            suggestedPrice: Math.round(fallbackPrice / 1000) * 1000,
            reason: '유사 상품 데이터 부족 - 소비자가 기준 50% 적용 (할인 여유 포함)',
            priceRange: { min: fallbackPrice * 0.7, max: fallbackPrice * 1.3 }
        };
    }
}

/**
 * 3. MD 상품소개 자동 생성
 * 매력적이고 판매에 도움되는 상품 설명 자동 생성
 */
export async function generateMDDescription(product: {
    name: string;
    brand: string;
    category: string;
    condition: string;
    size?: string;
    fabric?: string;
    imageUrl?: string;
    labelImageUrls?: string[];
}): Promise<string> {
    try {
        const prompt = `# 역할 정의
당신은 세계 최고의 빈티지/중고 의류 전문가이자 패션 큐레이터 **'MD 소개'**입니다. 단순히 옷을 파는 것이 아니라, 옷에 담긴 역사적 가치를 발굴하여 컬렉터들에게 전달하는 아카이브 전문가이자 자산 가치 평가사입니다. 수십 년간 빈티지 의류를 다뤄온 경험으로 소재의 질감, 봉제 기법, 연대별 디테일 차이를 정확히 감별합니다.

# 핵심 미션
1. **브랜드 헤리티지 우선**: 모든 설명은 브랜드의 역사적 기원, 패션사 내 위상, 특정 라인의 희소성부터 서술합니다.
2. **SEO 최적화 명칭**: 기존 상품명을 분석하여 컬렉터가 선호하는 키워드(Archive, 90s-00s, Deadstock, Technical, Sartorial 등)를 조합한 품격 있는 이름으로 재정의합니다.
3. **지능적 시세 제안 (Archive Value)**: 브랜드의 현재 위상과 소재를 분석하여 '아카이브 밸류'라는 용어를 사용하여 투자 가치를 설득합니다.
4. **디테일 Deep Dive**: 소재의 에이징, 봉제 방식, 특정 연식의 디테일 등 전문가적 팁을 포함합니다.

# 분석할 상품 정보
- 상품명: ${product.name}
- 브랜드: ${product.brand}
- 카테고리: ${product.category}
- 등급: ${product.condition}
- 사이즈: ${product.size || '미기재'}
- 소재/원단: ${product.fabric || '이미지에서 확인'}

# 출력 규칙
1. 반드시 이미지를 직접 분석하여 실제 보이는 디테일(색상, 패턴, 소재감, 봉제, 라벨, 버튼, 지퍼 등)을 묘사하세요.
2. 아래 구조를 따르되, 각 항목은 2~3문장으로 작성하세요.
3. HTML 태그 없이 순수 텍스트로만 작성하세요.
4. 마크다운 기호(###, **, --- 등)도 사용하지 마세요.
5. 자연스러운 한국어로, 격조 있지만 읽기 쉬운 톤으로 작성하세요.
6. 상품명이나 제목을 절대 출력하지 마세요. [Brand Heritage]부터 바로 시작하세요.

# 출력 구조 (섹션 제목은 반드시 아래 영어 그대로 사용)

[Brand Heritage]
(브랜드의 역사적 배경, 패션사에서의 상징성, 이 시기/컬렉션의 희소성을 컬렉터에게 설명하여 소유욕을 자극하세요)

[Detail Guide]
(관찰된 소재의 질감, 에이징 상태, 단추/지퍼/포켓 등 디테일의 만듦새를 정밀하게 묘사하세요)

[Styling Point]
(이 상품을 현대적으로 어떻게 코디하면 좋을지, 어떤 무드로 완성되는지 감각적으로 제안하세요)

[Archive Value]
(시간이 흐를수록 가치가 높아지는 이유, 소장 가치, 투자가치 관점에서의 매력을 강조하세요)

[Collector's Comment]
(이 옷을 만났을 때의 감동을 담은 짧고 여운 있는 한 문장)`;

        // 이미지 Vision 분석 (상품 사진 + label 이미지 직접 확인)
        const parts: any[] = [{ text: prompt }];
        if (product.imageUrl) {
            try {
                const imageBase64 = await fetchImageAsBase64(product.imageUrl);
                const mimeType = product.imageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
                parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: imageBase64
                    }
                });
            } catch (imgErr) {
                console.warn('MD소개글: 이미지 로드 실패, 텍스트만으로 생성', imgErr);
            }
        }
        // label 이미지 추가 (브랜드택/세탁택 → 소재 분석 정확도 향상)
        if (product.labelImageUrls && product.labelImageUrls.length > 0) {
            for (const labelUrl of product.labelImageUrls) {
                try {
                    const labelB64 = await fetchImageAsBase64(labelUrl);
                    parts.push({
                        inline_data: {
                            mime_type: 'image/jpeg',
                            data: labelB64
                        }
                    });
                } catch (labelErr) {
                    console.warn('MD소개글: label 이미지 로드 실패', labelErr);
                }
            }
        }

        // MD코멘트는 고품질 모델 사용 (Gemini 2.5 Flash), 실패 시 2.0 Flash 폴백
        let response = await fetch(`${GEMINI_MD_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts }]
            })
        });

        if (!response.ok) {
            console.warn('Gemini 2.5 Flash 실패, 2.0 Flash로 폴백');
            response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }]
                })
            });
        }

        const data = await response.json();

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('AI 응답 실패');
        }

        let description = data.candidates[0].content.parts[0].text.trim();

        // Markdown/HTML/코드블록 잔여물 제거
        description = description.replace(/```[a-z]*\n?|\n?```/g, '');
        description = description.replace(/^---$/gm, '');
        // ### 마크다운 헤더 → 대괄호 섹션 형태로 정리
        description = description.replace(/^###\s*\*?\*?(.+?)\*?\*?\s*$/gm, '[$1]');
        // ** 볼드 마크다운 제거
        description = description.replace(/\*\*(.+?)\*\*/g, '$1');
        // [Brand Heritage] 이전에 나오는 모든 텍스트(상품명, 영문 제목 등) 제거
        const firstSectionIdx = description.indexOf('[Brand Heritage]');
        if (firstSectionIdx > 0) {
            description = description.slice(firstSectionIdx);
        } else {
            // [Brand Heritage]가 없으면 첫 번째 [ 섹션 시작 전 텍스트 제거
            const firstBracketIdx = description.indexOf('\n[');
            if (firstBracketIdx > 0) {
                description = description.slice(firstBracketIdx + 1);
            }
        }

        return description;
    } catch (error) {
        console.error('MD description generation error:', error);
        return `${product.brand}의 ${product.category} 상품입니다. ${product.condition} 등급으로 상태가 양호합니다. 실물 사진을 확인해주세요.`;
    }
}

/**
 * 3-2. MD 소개글 무드이미지 AI 생성
 * Gemini Image Generation으로 상품 컨셉에 맞는 감성 무드이미지 생성
 */
export async function generateMoodImage(product: {
    name: string;
    brand: string;
    category: string;
    imageUrl?: string;
}): Promise<{ imageBase64: string; mimeType: string } | null> {
    try {
        const MOOD_MODEL = 'gemini-2.5-flash-image';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MOOD_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const prompt = `You are a top-tier fashion editorial photographer and visual director.

Generate ONE high-end fashion magazine mood image inspired by this product:
- Brand: ${product.brand || 'Unknown'}
- Product: ${product.name || 'Fashion item'}
- Category: ${product.category || 'Apparel'}

RULES:
1. Create a cinematic, editorial-style lifestyle/mood photograph
2. Reference the product's color palette, texture, and aesthetic from the provided product image
3. Style: Fashion magazine flat lay OR atmospheric lifestyle scene (coffee table, vintage interior, studio props)
4. Mood: Elevated, curated, collector-grade aesthetic — think "vintage archive meets modern editorial"
5. Color tone: Warm earth tones, muted neutrals, or vintage film grain — match the product's vibe
6. ABSOLUTELY NO TEXT, LOGOS, WATERMARKS, OR LETTERS in the image
7. DO NOT show the actual product — create an atmospheric mood that COMPLEMENTS the product
8. Think: the kind of image you'd see in a high-end resale editorial (e.g., Grailed, The RealReal editorial spreads)
9. Include subtle fashion-related props: leather goods, vintage cameras, coffee cups, botanical elements, etc.`;

        const parts: any[] = [{ text: prompt }];

        // 상품 이미지 첨부 (색상/톤 참조용)
        if (product.imageUrl) {
            try {
                const imageBase64 = await fetchImageAsBase64(product.imageUrl);
                parts.push({
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: imageBase64
                    }
                });
                parts.push({ text: 'Above is the product image. Match its color palette and aesthetic vibe in the mood image you generate.' });
            } catch (e) {
                console.warn('[MoodImage] 상품 이미지 로드 실패, 텍스트만으로 생성');
            }
        }

        const MAX_RETRIES = 3;
        let response: Response | null = null;
        let data: any = null;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts }],
                    generationConfig: {
                        responseModalities: ['TEXT', 'IMAGE'],
                        temperature: 1.0,
                        imageConfig: {
                            aspectRatio: '4:3',
                        },
                    },
                }),
            });
            data = await response.json();
            if (response.ok) break;
            const errMsg = data.error?.message || '';
            console.warn(`[MoodImage] attempt ${attempt + 1}/${MAX_RETRIES} failed: ${response.status} ${errMsg}`);
            const isRetryable = errMsg.includes('high demand') || errMsg.includes('overloaded') || response.status === 429 || response.status === 503;
            if (isRetryable) {
                await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
                continue;
            }
            break;
        }

        if (!response!.ok) {
            console.error('[MoodImage] Gemini 최종 오류:', data.error?.message || JSON.stringify(data).slice(0, 500));
            return null;
        }

        // 이미지 파트 추출 (TEXT+IMAGE 모드에서는 text/image 혼합 응답)
        const candidate = data.candidates?.[0]?.content?.parts;
        if (!candidate) {
            console.error('[MoodImage] 응답에 candidates 없음:', JSON.stringify(data).slice(0, 500));
            return null;
        }

        for (const part of candidate) {
            // Gemini API 응답은 camelCase (inlineData, mimeType)
            if (part.inlineData) {
                console.log('[MoodImage] 이미지 생성 성공, mimeType:', part.inlineData.mimeType);
                return {
                    imageBase64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'image/png',
                };
            }
        }

        console.error('[MoodImage] 응답에 inlineData 없음, parts:', candidate.map((p: any) => Object.keys(p)));
        return null;
    } catch (error) {
        console.error('[MoodImage] 생성 오류:', error);
        return null;
    }
}

/**
 * 4. 썸네일 자동화
 * 이미지를 정사각형으로 크롭하고 최적화
 */
export async function generateThumbnail(imageUrl: string): Promise<string> {
    // 실제 구현시 Cloudinary, imgix 등의 이미지 처리 서비스 사용
    // 또는 Sharp 라이브러리로 서버사이드 처리

    // 임시: URL 파라미터로 크롭 (Cloudinary 스타일)
    const optimizedUrl = imageUrl.includes('cloudinary')
        ? imageUrl.replace('/upload/', '/upload/c_fill,w_800,h_800,g_auto/')
        : imageUrl;

    return optimizedUrl;
}

/**
 * 5. 가상 피팅 (나노바나나 스타일)
 * Replicate API를 사용한 가상 착용 이미지 생성
 */
export async function generateVirtualFitting(
    garmentImageUrl: string,
    modelImageUrl: string = 'default_model'
): Promise<string> {
    try {
        // Replicate의 Virtual Try-On 모델 사용
        // 예: IDM-VTON, OOTDiffusion 등

        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                version: 'virtual-tryon-model-version', // 실제 모델 버전
                input: {
                    garment_image: garmentImageUrl,
                    model_image: modelImageUrl,
                    category: 'upper_body' // or 'lower_body', 'dress'
                }
            })
        });

        const prediction = await response.json();

        // 결과 폴링
        let result = prediction;
        while (result.status !== 'succeeded' && result.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const statusResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${prediction.id}`,
                { headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` } }
            );
            result = await statusResponse.json();
        }

        return result.output || garmentImageUrl;
    } catch (error) {
        console.error('Virtual fitting error:', error);
        return garmentImageUrl; // 실패시 원본 반환
    }
}

/**
 * 통합 AI 분석 (한번에 모든 분석 수행)
 */
export async function analyzeProductComplete(product: {
    id: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string;
    price_consumer?: number;
    size?: string;
    labelImageUrls?: string[];
}): Promise<AIAnalysisResult> {
    console.log(`🤖 AI 분석 시작: ${product.id}${product.labelImageUrls?.length ? ` (label ${product.labelImageUrls.length}장 포함)` : ''}`);

    // 1. 이미지 분석 (Grade + Metadata Extraction) — label 이미지 포함
    const imageAnalysisResult = await analyzeProductImage(product.imageUrl, product.name, product.labelImageUrls);

    // 2. 가격 및 MD Desc 병렬 생성 (이미지 분석 결과를 일부 활용 가능하지만, 속도를 위해 병렬 처리하되, 가격은 나중에 보정)
    // 하지만 정확도를 위해 먼저 이미지 분석을 끝내고 가격을 산정하는 것이 좋음.

    // MD Description (label 이미지 포함 → 소재 정밀 분석)
    const mdDescriptionPromise = generateMDDescription({
        name: imageAnalysisResult.suggestedName || product.name,
        brand: imageAnalysisResult.suggestedBrand || product.brand,
        category: product.category,
        condition: imageAnalysisResult.grade,
        size: imageAnalysisResult.suggestedSize || product.size,
        fabric: imageAnalysisResult.suggestedFabric,
        imageUrl: product.imageUrl,
        labelImageUrls: product.labelImageUrls,
    });

    // Price Suggestion
    const priceSuggestionPromise = suggestPrice({
        name: imageAnalysisResult.suggestedName || product.name,
        brand: imageAnalysisResult.suggestedBrand || product.brand,
        category: product.category,
        condition: imageAnalysisResult.grade,
        price_consumer: product.price_consumer
    });

    const [mdDescription, finalPriceResult] = await Promise.all([mdDescriptionPromise, priceSuggestionPromise]);

    return {
        grade: imageAnalysisResult.grade,
        gradeReason: imageAnalysisResult.reason,
        suggestedPrice: finalPriceResult.suggestedPrice,
        priceReason: finalPriceResult.reason,
        mdDescription,
        keywords: extractKeywords(imageAnalysisResult.suggestedName || product.name),
        confidence: imageAnalysisResult.confidence,

        suggestedConsumerPrice: imageAnalysisResult.suggestedConsumerPrice,

        // New columns
        suggestedName: imageAnalysisResult.suggestedName,
        suggestedBrand: imageAnalysisResult.suggestedBrand,
        suggestedSize: imageAnalysisResult.suggestedSize,
        suggestedFabric: imageAnalysisResult.suggestedFabric,
        suggestedCategory: imageAnalysisResult.suggestedCategory,
        suggestedGender: imageAnalysisResult.suggestedGender,
        vibe: imageAnalysisResult.vibe,
        stylingTips: imageAnalysisResult.stylingTips,
    };
}

/**
 * 6. 최종 퀄리티 체크 및 교정 (Spelling & Tone Polish)
 * 저장 전 마지막으로 오타, 문법, 톤을 점검하고 보정합니다.
 */
export async function polishProductDraft(draft: {
    name: string;
    brand: string;
    md_comment: string;
    fabric: string;
    size: string;
}): Promise<{
    polishedName: string;
    polishedMD: string;
    polishedFabric: string;
    corrections: string[];
}> {
    try {
        const prompt = `
당신은 의류 커머스 전문 카피라이터이자 교정 전문가입니다.
다음 상품 데이터를 분석하여 '오타 수정', '문법 교정', '판매 매력도 향상'을 처리해주세요.

[데이터]
상품명: ${draft.name}
브랜드: ${draft.brand}
MD소개글: ${draft.md_comment}
원단: ${draft.fabric}
사이즈: ${draft.size}

[수칙]
1. 모든 오타를 수정하세요 (특히 브랜드명, 소재 명칭).
2. "綿 100%" 같은 일본어/오타는 반드시 "면 100%"로 교정하세요.
3. MD소개글의 말투를 우아하고 전문적인 '큐레이터' 톤으로 유지하되, 문장이 매끄럽지 않은 부분을 다듬으세요.
4. 상품명을 SEO에 최적화되면서도 읽기 좋게 다듬으세요.
5. 수정된 사항이 있다면 'corrections' 배열에 간단히 적어주세요.

다음 JSON 형식으로만 답변하세요:
{
  "polishedName": "...",
  "polishedMD": "...",
  "polishedFabric": "...",
  "corrections": ["오타 수정: ...", "문법 교정: ..."]
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);

        return {
            polishedName: result.polishedName || draft.name,
            polishedMD: result.polishedMD || draft.md_comment,
            polishedFabric: result.polishedFabric || draft.fabric,
            corrections: result.corrections || []
        };
    } catch (error) {
        console.error('Polish draft error:', error);
        return {
            polishedName: draft.name,
            polishedMD: draft.md_comment,
            polishedFabric: draft.fabric,
            corrections: []
        };
    }
}

// 헬퍼 함수들
export async function fetchImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

function extractKeywords(text: string): string[] {
    const keywords = text.split(/\s+/).filter(word =>
        word.length > 2 && /[A-Z가-힣]/.test(word)
    );
    return [...new Set(keywords)].slice(0, 5);
}
