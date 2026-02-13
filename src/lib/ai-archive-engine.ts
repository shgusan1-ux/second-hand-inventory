/**
 * 3-Phase AI Archive Classification Engine
 * Phase 1: Brand Intelligence (Gemini + Google Search Grounding)
 * Phase 2: Visual Intelligence (Gemini Vision)
 * Phase 3: Fusion Decision (Brand 40% + Vision 40% + Keyword 20%)
 */

import { classifyArchive } from '@/lib/classification/archive';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Gemini 2.0 Flash (Google Search Grounding 지원)
const GEMINI_2_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// Fallback: Gemini 1.5 Flash
const GEMINI_15_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const ARCHIVE_CATEGORIES = [
    'MILITARY ARCHIVE',
    'WORKWEAR ARCHIVE',
    'OUTDOOR ARCHIVE',
    'JAPANESE ARCHIVE',
    'HERITAGE EUROPE',
    'BRITISH ARCHIVE',
] as const;

type ArchiveCat = typeof ARCHIVE_CATEGORIES[number];

export interface BrandAnalysis {
    brand: string;
    country: string;
    founded: string;
    styleLineage: string;
    category: ArchiveCat | 'NONE';
    confidence: number;
    reason: string;
}

export interface VisualAnalysis {
    clothingType: string;
    fabric: string;
    pattern: string;
    details: string;
    structure: string;
    category: ArchiveCat | 'NONE';
    confidence: number;
    reason: string;
}

export interface ArchiveAIResult {
    category: ArchiveCat | 'ARCHIVE';
    confidence: number;
    brandAnalysis: BrandAnalysis | null;
    visualAnalysis: VisualAnalysis | null;
    keywordCategory: string;
    keywordScore: number;
    reason: string;
}

// ─── Phase 1: Brand Intelligence ─────────────────────────────────────

const BRAND_PROMPT = (productName: string) => `당신은 세계 최고의 빈티지/중고 의류 큐레이터입니다.
다음 상품의 브랜드를 분석하세요. 브랜드에 대해 알고 있는 모든 지식을 활용하세요.

상품명: ${productName}

6개 아카이브 카테고리:
1. MILITARY ARCHIVE - 군용/밀리터리 의류. Alpha Industries, Rothco, Propper, M-65, MA-1, BDU, 군복, 카모
2. WORKWEAR ARCHIVE - 워크웨어/작업복. Carhartt, Dickies, Red Kap, Pointer, Ben Davis, 더블니, 덕캔버스, 히코리
3. OUTDOOR ARCHIVE - 아웃도어/테크웨어. Patagonia, The North Face, Arc'teryx, Columbia, Mammut, Gore-Tex, 플리스
4. JAPANESE ARCHIVE - 일본 브랜드/아메카지. Visvim, Kapital, 45rpm, Beams, Needles, United Arrows, Nanamica, 셀비지, 인디고
5. HERITAGE EUROPE - 유럽 헤리티지/클래식. Ralph Lauren, Lacoste, Brooks Brothers, Tommy Hilfiger, Polo, 프레피, 아이비
6. BRITISH ARCHIVE - 영국 전통. Barbour, Burberry, Aquascutum, Fred Perry, Mackintosh, 왁스코튼, 타탄, 트위드

분석 항목을 JSON으로 응답:
{
  "brand": "정확한 영문 브랜드명",
  "country": "브랜드 국가",
  "founded": "설립년도 (모르면 빈문자열)",
  "styleLineage": "밀리터리/워크웨어/아웃도어/일본감성/유럽헤리티지/영국전통/기타",
  "category": "MILITARY ARCHIVE 또는 WORKWEAR ARCHIVE 또는 OUTDOOR ARCHIVE 또는 JAPANESE ARCHIVE 또는 HERITAGE EUROPE 또는 BRITISH ARCHIVE 또는 NONE",
  "confidence": 0~100,
  "reason": "분류 근거 (한국어, 1-2문장)"
}

중요:
- DOLCE&GABBANA, GUCCI 등 이탈리아 럭셔리 → HERITAGE EUROPE
- Nike, Adidas 등 스포츠 → 스타일에 따라 OUTDOOR 또는 NONE
- 일본에서 만든 미국풍 브랜드(Beams+, Engineered Garments) → JAPANESE ARCHIVE
- 확실하지 않으면 NONE (confidence 30 이하)
- JSON만 응답하세요.`;

export async function analyzeBrand(productName: string): Promise<BrandAnalysis> {
    const defaultResult: BrandAnalysis = {
        brand: '', country: '', founded: '', styleLineage: '기타',
        category: 'NONE', confidence: 0, reason: '분석 실패'
    };

    if (!GEMINI_API_KEY) return defaultResult;

    // Phase 1: Gemini 2.0 Flash + Google Search Grounding
    try {
        const result = await callGeminiWithSearch(BRAND_PROMPT(productName));
        if (result) return result as BrandAnalysis;
    } catch (e) {
        console.warn('[AI-Archive] Phase 1 Grounding 실패, fallback 시도:', (e as Error).message);
    }

    // Fallback: Gemini 2.0 Flash without grounding
    try {
        const result = await callGeminiText(GEMINI_2_URL, BRAND_PROMPT(productName));
        if (result) return result as BrandAnalysis;
    } catch (e) {
        console.warn('[AI-Archive] Phase 1 Gemini 2.0 실패, 1.5 fallback:', (e as Error).message);
    }

    // Final fallback: Gemini 1.5 Flash
    try {
        const result = await callGeminiText(GEMINI_15_URL, BRAND_PROMPT(productName));
        if (result) return result as BrandAnalysis;
    } catch (e) {
        console.error('[AI-Archive] Phase 1 완전 실패:', (e as Error).message);
    }

    return defaultResult;
}

// ─── Phase 2: Visual Intelligence ────────────────────────────────────

const VISUAL_PROMPT = (productName: string, brandContext: BrandAnalysis) => `당신은 세계 최고의 빈티지 의류 감정사입니다.

브랜드 분석 결과:
- 브랜드: ${brandContext.brand || '미확인'}
- 국가: ${brandContext.country || '미확인'}
- 스타일: ${brandContext.styleLineage || '미확인'}
- 1차 판정: ${brandContext.category} (신뢰도: ${brandContext.confidence})

상품명: ${productName}

이 정보를 참고하여 상품 이미지의 시각적 특성을 정밀 분석하세요.

6개 아카이브 카테고리별 시각적 특성:
1. MILITARY ARCHIVE - 카모플라주, 올리브/카키/탄, 에폴릿, 벨크로, 패치, 유틸리티포켓, 나일론 리플스탑
2. WORKWEAR ARCHIVE - 덕캔버스, 히코리스트라이프, 더블니, 트리플스티치, 대형포켓, 견고한 구조, 바이브립
3. OUTDOOR ARCHIVE - 나일론셸, 고어텍스멤브레인, 플리스, 드로코드, 벨크로탭, 반사테이프, 레이어링
4. JAPANESE ARCHIVE - 인디고염색, 셀비지데님, 보로/사시코패치, 천연소재, 핸드크래프트디테일
5. HERITAGE EUROPE - 울블렌드, 옥스포드, 피케, 니트웨어, 클래식핏, 자수로고, 금속버튼
6. BRITISH ARCHIVE - 왁스드코튼, 해리스트위드, 타탄체크, 코듀로이, 가죽패치, 벨벳칼라

JSON으로 응답:
{
  "clothingType": "아우터/상의/하의/원피스/기타",
  "fabric": "관찰된 소재 특성",
  "pattern": "패턴 (카모/타탄/히코리/솔리드/인디고 등)",
  "details": "핵심 디테일 (에폴릿/더블니/플리스 등)",
  "structure": "구조 특성 (밀리터리커팅/워크웨어구조 등)",
  "category": "MILITARY ARCHIVE 또는 WORKWEAR ARCHIVE 또는 OUTDOOR ARCHIVE 또는 JAPANESE ARCHIVE 또는 HERITAGE EUROPE 또는 BRITISH ARCHIVE 또는 NONE",
  "confidence": 0~100,
  "reason": "시각 분석 근거 (한국어, 1-2문장)"
}

중요: 브랜드 분석과 시각 분석이 다를 수 있습니다. 이미지에서 보이는 것을 우선하세요.
JSON만 응답하세요.`;

export async function analyzeVisual(
    imageUrl: string,
    productName: string,
    brandContext: BrandAnalysis
): Promise<VisualAnalysis> {
    const defaultResult: VisualAnalysis = {
        clothingType: '기타', fabric: '', pattern: '', details: '', structure: '',
        category: 'NONE', confidence: 0, reason: '시각 분석 실패'
    };

    if (!GEMINI_API_KEY || !imageUrl) return defaultResult;

    const prompt = VISUAL_PROMPT(productName, brandContext);

    // Gemini 2.0 Flash Vision
    try {
        const result = await callGeminiVision(GEMINI_2_URL, prompt, imageUrl);
        if (result) return result as VisualAnalysis;
    } catch (e) {
        console.warn('[AI-Archive] Phase 2 Gemini 2.0 Vision 실패, 1.5 fallback:', (e as Error).message);
    }

    // Fallback: Gemini 1.5 Flash Vision
    try {
        const result = await callGeminiVision(GEMINI_15_URL, prompt, imageUrl);
        if (result) return result as VisualAnalysis;
    } catch (e) {
        console.error('[AI-Archive] Phase 2 완전 실패:', (e as Error).message);
    }

    return defaultResult;
}

// ─── Phase 3: Fusion Decision ────────────────────────────────────────

export async function classifyForArchive(product: {
    id: string;
    name: string;
    imageUrl?: string;
}): Promise<ArchiveAIResult> {
    // Phase 1: Brand Intelligence
    const brandResult = await analyzeBrand(product.name);

    // Phase 2: Visual Intelligence (이미지 있는 경우만)
    let visualResult: VisualAnalysis | null = null;
    if (product.imageUrl) {
        visualResult = await analyzeVisual(product.imageUrl, product.name, brandResult);
    }

    // Phase 3-1: Keyword matching (기존 엔진)
    const keywordResult = classifyArchive(product.name, []);

    // Phase 3-2: Fusion scoring
    const scores: Record<string, number> = {};
    ARCHIVE_CATEGORIES.forEach(cat => {
        scores[cat] = 0;

        // Brand signal (40%)
        if (brandResult.category === cat) {
            scores[cat] += brandResult.confidence * 0.4;
        }

        // Visual signal (40%) - 이미지 없으면 Brand 80%로 보상
        if (visualResult) {
            if (visualResult.category === cat) {
                scores[cat] += visualResult.confidence * 0.4;
            }
        } else {
            // 이미지 없으면 Brand weight 증가
            if (brandResult.category === cat) {
                scores[cat] += brandResult.confidence * 0.3;
            }
        }

        // Keyword signal (20%)
        if (keywordResult.category === cat) {
            scores[cat] += keywordResult.score * 0.2;
        }
    });

    // 동의 보너스: 2개 이상 동일 카테고리면 +10
    ARCHIVE_CATEGORIES.forEach(cat => {
        let agreements = 0;
        if (brandResult.category === cat) agreements++;
        if (visualResult?.category === cat) agreements++;
        if (keywordResult.category === cat) agreements++;
        if (agreements >= 2) scores[cat] += 10;
    });

    // 최고 점수 카테고리 선택
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestCat, bestScore] = entries[0];

    // 이유 생성
    const reasons: string[] = [];
    if (brandResult.category !== 'NONE') {
        reasons.push(`브랜드(${brandResult.brand || '?'}): ${brandResult.category}`);
    }
    if (visualResult && visualResult.category !== 'NONE') {
        reasons.push(`시각: ${visualResult.category}`);
    }
    if (keywordResult.category !== 'UNCATEGORIZED') {
        reasons.push(`키워드: ${keywordResult.category}`);
    }

    return {
        category: bestScore > 30 ? bestCat as ArchiveCat : 'ARCHIVE',
        confidence: Math.round(Math.min(100, bestScore)),
        brandAnalysis: brandResult,
        visualAnalysis: visualResult,
        keywordCategory: keywordResult.category,
        keywordScore: keywordResult.score,
        reason: reasons.length > 0 ? reasons.join(' | ') : '분류 근거 부족 → 미분류',
    };
}

// ─── Gemini API Helpers ──────────────────────────────────────────────

async function callGeminiWithSearch(prompt: string): Promise<any> {
    const res = await fetch(`${GEMINI_2_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ googleSearch: {} }],
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Search API ${res.status}: ${errText.substring(0, 200)}`);
    }

    return parseGeminiResponse(await res.json());
}

async function callGeminiText(apiUrl: string, prompt: string): Promise<any> {
    const res = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Text API ${res.status}: ${errText.substring(0, 200)}`);
    }

    return parseGeminiResponse(await res.json());
}

async function callGeminiVision(apiUrl: string, prompt: string, imageUrl: string): Promise<any> {
    // 이미지를 base64로 변환
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let base64: string;
    try {
        const imgRes = await fetch(imageUrl, { signal: controller.signal });
        if (!imgRes.ok) throw new Error(`Image fetch ${imgRes.status}`);
        const buffer = await imgRes.arrayBuffer();
        base64 = Buffer.from(buffer).toString('base64');
    } finally {
        clearTimeout(timeoutId);
    }

    const res = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                ],
            }],
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Vision API ${res.status}: ${errText.substring(0, 200)}`);
    }

    return parseGeminiResponse(await res.json());
}

function parseGeminiResponse(data: any): any {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.warn('[AI-Archive] Gemini 응답에 text 없음:', JSON.stringify(data).substring(0, 300));
        return null;
    }

    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();

    try {
        return JSON.parse(jsonStr);
    } catch {
        // JSON 추출 시도: 첫 번째 { ... } 블록 찾기
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
        console.error('[AI-Archive] JSON 파싱 실패:', jsonStr.substring(0, 200));
        return null;
    }
}

// ─── Rate Limiter ────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function classifyBatchForArchive(
    products: { id: string; name: string; imageUrl?: string }[],
    onProgress?: (current: number, total: number, product: string, phase: string) => void
): Promise<{ productId: string; result: ArchiveAIResult }[]> {
    const results: { productId: string; result: ArchiveAIResult }[] = [];

    for (let i = 0; i < products.length; i++) {
        const product = products[i];

        try {
            onProgress?.(i + 1, products.length, product.name.substring(0, 30), 'brand');
            const result = await classifyForArchive(product);
            results.push({ productId: product.id, result });
            onProgress?.(i + 1, products.length, product.name.substring(0, 30), 'done');
        } catch (e) {
            console.error(`[AI-Archive] 분류 실패 ${product.id}:`, (e as Error).message);
            results.push({
                productId: product.id,
                result: {
                    category: 'ARCHIVE',
                    confidence: 0,
                    brandAnalysis: null,
                    visualAnalysis: null,
                    keywordCategory: 'UNCATEGORIZED',
                    keywordScore: 0,
                    reason: `분류 실패: ${(e as Error).message}`,
                },
            });
        }

        // Rate limiting: Gemini 15 RPM → 상품당 2콜 → ~4초 간격
        if (i < products.length - 1) {
            await delay(2500);
        }
    }

    return results;
}
