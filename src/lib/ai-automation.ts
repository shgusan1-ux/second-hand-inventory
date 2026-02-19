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
    mdDescription: string;
    keywords: string[];
    confidence: number;
    // New fields
    suggestedName: string;
    suggestedBrand: string;
    suggestedSize: string;
    suggestedFabric: string;
}

/**
 * 1. 이미지 종합 분석 (등급, 상품명, 브랜드, 사이즈, 원단)
 * 이미지를 분석하여 상품의 상세 정보를 추출합니다.
 */
export async function analyzeProductImage(imageUrl: string, currentName: string): Promise<{
    grade: 'S급' | 'A급' | 'B급';
    reason: string;
    confidence: number;
    suggestedName: string;
    suggestedBrand: string;
    suggestedSize: string;
    suggestedFabric: string;
}> {
    try {
        const prompt = `
당신은 중고 의류 전문 감정사입니다. 
이미지를 정밀하게 분석하여 다음 정보를 JSON 형식으로 추출해주세요.

입력된 상품명 참고: ${currentName}

추출 항목:
1. grade: 상태 등급 
   - S급 (새상품급): 사용감 없음, 오염/손상 없음
   - A급 (사용감 적음): 미세한 사용감, 상태 양호
   - B급 (사용감 있음): 눈에 띄는 사용감, 오염/손상 존재
2. reason: 등급 판정 근거 (구체적)
3. confidence: 신뢰도 (0-100)
4. suggestedName: 상품명 (브랜드 + 카테고리 + 특징 조합하여 간결하게, 예: "나이키 스우시 후드티")
5. suggestedBrand: 브랜드명 (로고나 텍스트로 식별, 식별 불가시 "Generic" 또는 공란)
6. suggestedSize: 사이즈 (라벨에 적힌 표기 "M", "95", "100" 등, 식별 불가시 공란)
7. suggestedFabric: 원단/소재 (라벨 텍스트 또는 재질감 추정, 예: "면 100%", "폴리에스터 혼방")

다음 JSON 형식으로만 답변하세요:
{
  "grade": "S급" | "A급" | "B급",
  "reason": "...",
  "confidence": 85,
  "suggestedName": "...",
  "suggestedBrand": "...",
  "suggestedSize": "...",
  "suggestedFabric": "..."
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
            suggestedFabric: result.suggestedFabric || ''
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
            suggestedFabric: ''
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

        // 2. 통계 계산
        const avgPrice = soldPrices.length > 0
            ? soldPrices.reduce((a: number, b: number) => a + b, 0) / soldPrices.length
            : (product.price_consumer || 50000) * 0.3;

        const minPrice = soldPrices.length > 0 ? Math.min(...soldPrices) : avgPrice * 0.7;
        const maxPrice = soldPrices.length > 0 ? Math.max(...soldPrices) : avgPrice * 1.3;

        // 3. 등급 보정
        let gradeMultiplier = 1.0;
        if (product.condition === 'S급') gradeMultiplier = 1.2;
        else if (product.condition === 'B급') gradeMultiplier = 0.8;

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
        const fallbackPrice = (product.price_consumer || 50000) * 0.3;
        return {
            suggestedPrice: Math.round(fallbackPrice / 1000) * 1000,
            reason: '유사 상품 데이터 부족 - 소비자가 기준 30% 적용',
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
}): Promise<string> {
    try {
        const prompt = `# 역할 정의
당신은 세계 최고의 중고 의류 패션 큐레이터 **'MD 소개'**입니다. 단순히 옷을 파는 것이 아니라, 옷에 담긴 역사적 가치를 발굴하여 컬렉터들에게 전달하는 아카이브 전문가이자 자산 가치 평가사입니다.

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

# 출력 구조

[브랜드 헤리티지]
(브랜드의 역사, 패션사 내 위상, 이 라인/컬렉션의 의미)

[디테일 가이드]
(이미지에서 확인되는 소재감, 봉제 방식, 디테일 포인트, 에이징 상태)

[아카이브 밸류]
(이 상품의 투자 가치, 희소성, 컬렉터 관점에서의 매력)

[컬렉터 코멘트]
(감성적인 한 줄 평)`;

        // 이미지 Vision 분석 (이미지 직접 확인)
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

        return description;
    } catch (error) {
        console.error('MD description generation error:', error);
        return `${product.brand}의 ${product.category} 상품입니다. ${product.condition} 등급으로 상태가 양호합니다. 실물 사진을 확인해주세요.`;
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
}): Promise<AIAnalysisResult> {
    console.log(`🤖 AI 분석 시작: ${product.id}`);

    // 1. 이미지 분석 (Grade + Metadata Extraction)
    const imageAnalysisResult = await analyzeProductImage(product.imageUrl, product.name);

    // 2. 가격 및 MD Desc 병렬 생성 (이미지 분석 결과를 일부 활용 가능하지만, 속도를 위해 병렬 처리하되, 가격은 나중에 보정)
    // 하지만 정확도를 위해 먼저 이미지 분석을 끝내고 가격을 산정하는 것이 좋음.

    // MD Description
    const mdDescriptionPromise = generateMDDescription({
        name: imageAnalysisResult.suggestedName || product.name,
        brand: imageAnalysisResult.suggestedBrand || product.brand,
        category: product.category,
        condition: imageAnalysisResult.grade,
        size: imageAnalysisResult.suggestedSize || product.size,
        fabric: imageAnalysisResult.suggestedFabric,
        imageUrl: product.imageUrl
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

        // New columns
        suggestedName: imageAnalysisResult.suggestedName,
        suggestedBrand: imageAnalysisResult.suggestedBrand,
        suggestedSize: imageAnalysisResult.suggestedSize,
        suggestedFabric: imageAnalysisResult.suggestedFabric
    };
}

// 헬퍼 함수들
async function fetchImageAsBase64(url: string): Promise<string> {
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
