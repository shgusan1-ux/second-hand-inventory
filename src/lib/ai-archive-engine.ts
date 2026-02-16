/**
 * AI 아카이브 분류 엔진 v3.0 — 속도 최적화
 *
 * 핵심 변경: 상품당 1번의 통합 API 콜 (브랜드+이미지 동시 분석)
 * + 3개 상품 동시 병렬 처리
 *
 * 속도 비교:
 * v2.0: Brand(3s) → Vision(3s) → delay(3s) = 9s/상품, 10개 = 90s
 * v3.0: Combined(3s) + delay(1s) = 4s/상품, 3병렬 → 10개 = ~15s
 *
 * Gemini 3 Pro (무조건 사용) + Gemini 2.5 Flash (fallback)
 */

import { classifyArchive } from '@/lib/classification/archive';
import { lookupBrand } from '@/lib/classification/brand-tier-database';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Gemini 3 Pro — 세계 최고 멀티모달 모델
const GEMINI_3_PRO_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent';
// Fallback: Gemini 2.5 Flash
const GEMINI_25_FLASH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const ARCHIVE_CATEGORIES = [
    'MILITARY ARCHIVE',
    'WORKWEAR ARCHIVE',
    'OUTDOOR ARCHIVE',
    'JAPANESE ARCHIVE',
    'HERITAGE EUROPE',
    'BRITISH ARCHIVE',
    'UNISEX ARCHIVE',
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
    colorPalette: string;
    genderPresentation: string;
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

// ─── 통합 프롬프트 (1번의 API 콜로 브랜드+이미지 동시 분석) ──────────

const COMBINED_PROMPT = (productName: string, hasImage: boolean) => `당신은 세계 최고의 빈티지·중고 의류 큐레이터입니다.
상품명${hasImage ? '과 이미지' : ''}를 분석하여 7개 아카이브 카테고리 중 하나로 분류하세요.

상품명: "${productName}"

━━━ 7개 ARCHIVE 카테고리 ━━━
1. MILITARY ARCHIVE — 군용/밀리터리 (Alpha Industries, Rothco, M-65, MA-1, BDU, 카모, 야상)
2. WORKWEAR ARCHIVE — 워크웨어/작업복 (Carhartt, Dickies, Red Kap, 초어코트, 커버올, 더블니, 히코리)
3. OUTDOOR ARCHIVE — 아웃도어 (Patagonia, TNF, Arc'teryx, Gore-Tex, 플리스, 눕시, 아노락)
4. JAPANESE ARCHIVE — 일본/아메카지 (Visvim, Kapital, Beams, Needles, 셀비지, 인디고, 보로)
5. HERITAGE EUROPE — 유럽 럭셔리/하이엔드만 (Gucci, Prada, Dior, Saint Laurent, Balenciaga, Valentino, Versace 등 유럽 명품)
6. BRITISH ARCHIVE — 영국 전통 (Barbour, Burberry, Fred Perry, Mackintosh, 왁스코튼, 타탄, 트위드)
7. UNISEX ARCHIVE — 미국 캐주얼/대중 브랜드 + 유니섹스 (Polo Ralph Lauren, Tommy Hilfiger, Gap, Nike, Adidas, Champion, Lacoste, Levi's, 남녀공용, 프리사이즈)

분류 규칙:
- 브랜드 식별이 최우선. 브랜드 원산지와 DNA를 고려
- 동일 브랜드라도 아이템 특성에 따라 다를 수 있음 (Nike 카고 → MILITARY)
- 일본 브랜드 → JAPANESE, 영국 브랜드 → BRITISH 우선
- HERITAGE EUROPE는 오직 유럽 럭셔리/하이엔드 브랜드만 (Gucci, Prada, Dior 등)
- 미국 대중 캐주얼 (Polo, Tommy, Gap, Nike, Adidas, Champion, Levi's 등) → UNISEX ARCHIVE
- Lacoste 등 프렌치 캐주얼도 대중적이면 → UNISEX ARCHIVE
- 브랜드 불명 + 성별 무관 기본 아이템 → UNISEX ARCHIVE
- 확신 없으면 confidence 30 이하
${hasImage ? '\n- 이미지에서 소재, 패턴, 디테일, 구조를 관찰하여 판단에 활용' : ''}

JSON으로만 응답:
{
  "brand": { "name": "영문 브랜드명", "country": "국가", "category": "7개 중 하나 또는 NONE", "confidence": 0~100, "reason": "근거" },
  "visual": { "clothingType": "아우터/상의/하의/기타", "fabric": "소재", "pattern": "패턴", "category": "7개 중 하나 또는 NONE", "confidence": 0~100, "reason": "근거" },
  "finalCategory": "최종 카테고리 (7개 중 하나 또는 NONE)",
  "finalConfidence": 0~100,
  "finalReason": "최종 판정 근거 (한국어)"
}`;

// ─── 핵심: 1번의 API 콜로 모든 것을 분석 ────────────────────────────

export async function classifyForArchive(product: {
    id: string;
    name: string;
    imageUrl?: string;
}): Promise<ArchiveAIResult> {
    // 즉시 계산 (0ms)
    const keywordResult = classifyArchive(product.name, []);
    const contextScore = analyzeContext(product.name);
    const localBrand = lookupBrand(product.name);

    // 로컬 DB 힌트
    const localHint = localBrand.info
        ? `\n[참고: "${localBrand.info.canonical}" (${localBrand.info.origin}, ${localBrand.tier})]`
        : '';

    const hasImage = !!product.imageUrl;
    const prompt = COMBINED_PROMPT(product.name, hasImage) + localHint;

    let combinedResult: any = null;

    // 1차: Gemini 3 Pro (이미지 있으면 Vision, 없으면 Text)
    try {
        if (hasImage) {
            combinedResult = await callGeminiVision(GEMINI_3_PRO_URL, prompt, product.imageUrl!);
        } else {
            combinedResult = await callGeminiText(GEMINI_3_PRO_URL, prompt);
        }
    } catch (e) {
        console.warn('[AI-Archive] Gemini 3 Pro 실패:', (e as Error).message);
    }

    // 2차: Gemini 2.5 Flash fallback
    if (!combinedResult?.finalCategory) {
        try {
            if (hasImage) {
                combinedResult = await callGeminiVision(GEMINI_25_FLASH_URL, prompt, product.imageUrl!);
            } else {
                combinedResult = await callGeminiText(GEMINI_25_FLASH_URL, prompt);
            }
        } catch (e) {
            console.warn('[AI-Archive] Gemini 2.5 Flash도 실패:', (e as Error).message);
        }
    }

    // AI 결과 파싱
    const brandResult = parseBrandFromCombined(combinedResult);
    const visualResult = parseVisualFromCombined(combinedResult);
    const aiCategory = normalizeCategory(combinedResult?.finalCategory);
    const aiConfidence = Math.min(100, Math.max(0, combinedResult?.finalConfidence || 0));

    // Fusion scoring
    const scores: Record<string, number> = {};
    ARCHIVE_CATEGORIES.forEach(cat => {
        scores[cat] = 0;

        // AI 통합 판정 (50%)
        if (aiCategory === cat) {
            scores[cat] += aiConfidence * 0.50;
        }

        // Brand 개별 판정 (20%)
        if (brandResult.category === cat) {
            scores[cat] += brandResult.confidence * 0.20;
        }

        // Visual 개별 판정 (15%)
        if (visualResult && visualResult.category === cat) {
            scores[cat] += visualResult.confidence * 0.15;
        }

        // Keyword signal (10%)
        if (keywordResult.category === cat) {
            scores[cat] += keywordResult.score * 0.10;
        }

        // Context signal (5%)
        if (contextScore.category === cat) {
            scores[cat] += contextScore.confidence * 0.05;
        }
    });

    // 동의 보너스
    ARCHIVE_CATEGORIES.forEach(cat => {
        let agreements = 0;
        if (aiCategory === cat) agreements++;
        if (brandResult.category === cat) agreements++;
        if (visualResult?.category === cat) agreements++;
        if (keywordResult.category === cat) agreements++;
        if (agreements >= 3) scores[cat] += 12;
        else if (agreements >= 2) scores[cat] += 6;
    });

    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestCat, bestScore] = entries[0];

    // 이유 생성
    const reasons: string[] = [];
    if (combinedResult?.finalReason) reasons.push(combinedResult.finalReason);
    else {
        if (brandResult.category !== 'NONE') reasons.push(`브랜드:${brandResult.brand}→${brandResult.category}`);
        if (visualResult?.category !== 'NONE') reasons.push(`시각:${visualResult.category}`);
    }

    return {
        category: bestScore > 20 ? bestCat as ArchiveCat : 'ARCHIVE',
        confidence: Math.round(Math.min(100, bestScore)),
        brandAnalysis: brandResult,
        visualAnalysis: visualResult,
        keywordCategory: keywordResult.category,
        keywordScore: keywordResult.score,
        reason: reasons.length > 0 ? reasons.join(' | ') : '분류 근거 부족',
    };
}

// ─── Combined 결과 파싱 헬퍼 ─────────────────────────────────────────

function parseBrandFromCombined(data: any): BrandAnalysis {
    const b = data?.brand;
    if (!b) return { brand: '', country: '', founded: '', styleLineage: '기타', category: 'NONE', confidence: 0, reason: '' };
    return {
        brand: b.name || b.brand || '',
        country: b.country || '',
        founded: b.founded || '',
        styleLineage: b.styleLineage || '기타',
        category: normalizeCategory(b.category) as ArchiveCat | 'NONE',
        confidence: Math.min(100, Math.max(0, b.confidence || 0)),
        reason: b.reason || '',
    };
}

function parseVisualFromCombined(data: any): VisualAnalysis | null {
    const v = data?.visual;
    if (!v) return null;
    return {
        clothingType: v.clothingType || '기타',
        fabric: v.fabric || '',
        pattern: v.pattern || '',
        details: v.details || '',
        structure: v.structure || '',
        colorPalette: v.colorPalette || '',
        genderPresentation: v.genderPresentation || '중성적',
        category: normalizeCategory(v.category) as ArchiveCat | 'NONE',
        confidence: Math.min(100, Math.max(0, v.confidence || 0)),
        reason: v.reason || '',
    };
}

function normalizeCategory(cat: string | undefined | null): ArchiveCat | 'NONE' {
    if (!cat) return 'NONE';
    const catMap: Record<string, ArchiveCat> = {
        'MILITARY ARCHIVE': 'MILITARY ARCHIVE', 'MILITARY': 'MILITARY ARCHIVE',
        'WORKWEAR ARCHIVE': 'WORKWEAR ARCHIVE', 'WORKWEAR': 'WORKWEAR ARCHIVE',
        'OUTDOOR ARCHIVE': 'OUTDOOR ARCHIVE', 'OUTDOOR': 'OUTDOOR ARCHIVE',
        'JAPANESE ARCHIVE': 'JAPANESE ARCHIVE', 'JAPAN ARCHIVE': 'JAPANESE ARCHIVE',
        'JAPAN': 'JAPANESE ARCHIVE', 'JAPANESE': 'JAPANESE ARCHIVE',
        'HERITAGE EUROPE': 'HERITAGE EUROPE', 'HERITAGE ARCHIVE': 'HERITAGE EUROPE', 'HERITAGE': 'HERITAGE EUROPE',
        'BRITISH ARCHIVE': 'BRITISH ARCHIVE', 'BRITISH': 'BRITISH ARCHIVE',
        'UNISEX ARCHIVE': 'UNISEX ARCHIVE', 'UNISEX': 'UNISEX ARCHIVE',
    };
    return catMap[cat.toUpperCase()] || 'NONE';
}

// ─── Context Analysis ────────────────────────────────────────────────

function analyzeContext(productName: string): { category: ArchiveCat | 'NONE'; confidence: number } {
    const name = productName.toUpperCase();

    const patterns: [string[], ArchiveCat, number][] = [
        [['남녀공용', '유니섹스', 'UNISEX', '프리사이즈', 'FREE SIZE', 'FREESIZE'], 'UNISEX ARCHIVE', 60],
        [['M-65', 'M65', 'MA-1', 'MA1', 'N-3B', 'BDU', 'FIELD JACKET', 'CARGO', 'CAMO', 'CAMOUFLAGE', '군용', '군복', '밀리터리', '야상'], 'MILITARY ARCHIVE', 55],
        [['CHORE', 'COVERALL', 'OVERALL', 'DOUBLE KNEE', 'HICKORY', '초어', '커버올', '오버올', '더블니', '워크웨어'], 'WORKWEAR ARCHIVE', 55],
        [['GORE-TEX', 'GORETEX', 'FLEECE', 'ANORAK', 'NUPTSE', '플리스', '고어텍스', '아노락', '눕시'], 'OUTDOOR ARCHIVE', 55],
        [['WAXED', 'TARTAN', 'HARRIS TWEED', 'TRENCH', 'DUFFLE', 'HARRINGTON', '왁스', '타탄', '트위드', '더플'], 'BRITISH ARCHIVE', 50],
        [['SELVEDGE', 'SASHIKO', 'BORO', '셀비지', '사시코', '보로', '아메카지'], 'JAPANESE ARCHIVE', 50],
    ];

    for (const [keywords, category, confidence] of patterns) {
        if (keywords.some(k => name.includes(k))) return { category, confidence };
    }

    return { category: 'NONE', confidence: 0 };
}

// ─── 하위 호환 export (기존 코드용) ──────────────────────────────────

export async function analyzeBrand(productName: string): Promise<BrandAnalysis> {
    const localBrand = lookupBrand(productName);
    if (localBrand.info) {
        const tierToCat: Record<string, ArchiveCat> = {
            'MILITARY': 'MILITARY ARCHIVE', 'WORKWEAR': 'WORKWEAR ARCHIVE',
            'OUTDOOR': 'OUTDOOR ARCHIVE', 'JAPAN': 'JAPANESE ARCHIVE',
            'HERITAGE': 'HERITAGE EUROPE', 'BRITISH': 'BRITISH ARCHIVE',
            'UNISEX': 'UNISEX ARCHIVE',
        };
        return {
            brand: localBrand.info.canonical, country: localBrand.info.origin,
            founded: '', styleLineage: localBrand.tier,
            category: tierToCat[localBrand.tier] || 'NONE', confidence: 45,
            reason: `로컬 DB: ${localBrand.info.canonical}`,
        };
    }
    return { brand: '', country: '', founded: '', styleLineage: '기타', category: 'NONE', confidence: 0, reason: '' };
}

export async function analyzeVisual(): Promise<VisualAnalysis> {
    return { clothingType: '기타', fabric: '', pattern: '', details: '', structure: '', colorPalette: '', genderPresentation: '중성적', category: 'NONE', confidence: 0, reason: '' };
}

// ─── Gemini API Helpers ──────────────────────────────────────────────

async function callGeminiText(apiUrl: string, prompt: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

    try {
        const res = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini ${res.status}: ${errText.substring(0, 200)}`);
        }

        return parseGeminiResponse(await res.json());
    } finally {
        clearTimeout(timeoutId);
    }
}

async function callGeminiVision(apiUrl: string, prompt: string, imageUrl: string): Promise<any> {
    // 이미지 다운로드 (10초 타임아웃)
    const imgController = new AbortController();
    const imgTimeout = setTimeout(() => imgController.abort(), 10000);

    let base64: string;
    let mimeType = 'image/jpeg';
    try {
        const imgRes = await fetch(imageUrl, { signal: imgController.signal });
        if (!imgRes.ok) throw new Error(`Image ${imgRes.status}`);
        const contentType = imgRes.headers.get('content-type') || '';
        if (contentType.includes('png')) mimeType = 'image/png';
        else if (contentType.includes('webp')) mimeType = 'image/webp';
        const buffer = await imgRes.arrayBuffer();
        base64 = Buffer.from(buffer).toString('base64');
    } catch (e) {
        // 이미지 실패 → text-only fallback
        console.warn('[AI-Archive] 이미지 다운 실패, text-only:', (e as Error).message);
        return callGeminiText(apiUrl, prompt);
    } finally {
        clearTimeout(imgTimeout);
    }

    // Gemini Vision 호출 (30초 타임아웃)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const res = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: mimeType, data: base64 } },
                    ],
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                },
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini Vision ${res.status}: ${errText.substring(0, 200)}`);
        }

        return parseGeminiResponse(await res.json());
    } finally {
        clearTimeout(timeoutId);
    }
}

function parseGeminiResponse(data: any): any {
    // 모든 parts에서 텍스트 추출 시도
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
        if (part.text) {
            const jsonStr = part.text.replace(/```json\n?|\n?```/g, '').trim();
            try {
                return JSON.parse(jsonStr);
            } catch {
                const match = jsonStr.match(/\{[\s\S]*\}/);
                if (match) {
                    try { return JSON.parse(match[0]); } catch { continue; }
                }
            }
        }
    }
    console.warn('[AI-Archive] 응답 파싱 실패:', JSON.stringify(data).substring(0, 300));
    return null;
}

// ─── Batch Processing (3개 동시 병렬) ────────────────────────────────

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const CONCURRENCY = 3; // 동시 처리 수
const BATCH_DELAY = 1000; // 배치 간 딜레이 (1초)

export async function classifyBatchForArchive(
    products: { id: string; name: string; imageUrl?: string }[],
    onProgress?: (current: number, total: number, product: string, phase: string) => void
): Promise<{ productId: string; result: ArchiveAIResult }[]> {
    const results: { productId: string; result: ArchiveAIResult }[] = [];
    const total = products.length;

    // CONCURRENCY개씩 배치 처리
    for (let i = 0; i < total; i += CONCURRENCY) {
        const batch = products.slice(i, i + CONCURRENCY);

        // 배치 내 병렬 실행
        const batchResults = await Promise.all(
            batch.map(async (product, batchIdx) => {
                const globalIdx = i + batchIdx;
                const shortName = product.name.substring(0, 30);
                onProgress?.(globalIdx + 1, total, shortName, 'analyzing');

                try {
                    const result = await classifyForArchive(product);
                    onProgress?.(globalIdx + 1, total, shortName, 'done');
                    return { productId: product.id, result };
                } catch (e) {
                    console.error(`[AI-Archive] 분류 실패 ${product.id}:`, (e as Error).message);
                    return {
                        productId: product.id,
                        result: {
                            category: 'ARCHIVE' as const,
                            confidence: 0,
                            brandAnalysis: null,
                            visualAnalysis: null,
                            keywordCategory: 'UNCATEGORIZED',
                            keywordScore: 0,
                            reason: `분류 실패: ${(e as Error).message}`,
                        },
                    };
                }
            })
        );

        results.push(...batchResults);

        // 마지막 배치가 아니면 딜레이
        if (i + CONCURRENCY < total) {
            await delay(BATCH_DELAY);
        }
    }

    return results;
}
