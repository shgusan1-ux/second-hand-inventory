
import { db } from '@/lib/db';
import sharp from 'sharp';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// 모델 이름: flash=빠르고 저렴, pro=나노바나나 Pro (디테일 최고)
const MODELS = {
    flash: 'gemini-2.5-flash-image',
    pro: 'nano-banana-pro-preview',
} as const;

export interface FittingRequest {
    personImageBase64: string;      // 모델 사진
    clothingImageBase64: string;    // 상품 의류 이미지
    gender: 'MAN' | 'WOMAN' | 'KIDS';
    clothingType?: string;
    archiveCategory?: string;
    modelChoice: 'flash' | 'pro';
    productName?: string;
    variationSeed?: number;         // 다른 코디 생성용 시드
}

export interface FittingResult {
    imageBase64: string;
    mimeType: string;
    textResponse?: string;
}

// 프롬프트 설정 타입
interface PromptConfig {
    mainPrompt: string;
    genderDescriptions: Record<string, string>;
    genderStyleTips: Record<string, string>;
    categoryStyling: Record<string, { description: string; coordiItems: string[][] }>;
    defaultStyling: { description: string; coordiItems: string[][] };
}

// === 하드코딩 기본값 (DB에 없을 때 폴백) ===
const FALLBACK_CATEGORY_STYLING: Record<string, { description: string; coordiItems: string[][] }> = {
    'MILITARY ARCHIVE': {
        description: '밀리터리 무드의 시티보이/걸 스타일링. 2024-2025 한국 성수동·한남동 기반 밀리터리 캐주얼 트렌드',
        coordiItems: [
            ['와이드 카고 팬츠', '컴뱃 부츠', '무지 흰 티셔츠', '도그태그 목걸이'],
            ['슬림 블랙 데님', '첼시 부츠', '베이직 터틀넥', '가죽 벨트'],
            ['스트레이트 카키 팬츠', '독일군 스니커즈', '스트라이프 티', '캔버스 크로스백'],
            ['조거 팬츠', '뉴발란스 530', '후드티', '볼캡'],
        ],
    },
    'WORKWEAR ARCHIVE': {
        description: '워크웨어 기반의 아메카지·러기드 스타일링. 한국 20-30대 워크웨어 트렌드 (카하트, 디키즈 감성)',
        coordiItems: [
            ['스트레이트 로데님', '레드윙 워크부츠', '체크 플란넬 셔츠', '가죽 공구 벨트'],
            ['더블니 카펜터 팬츠', '클래식 워크부츠', '헨리넥 와플 티', '비니'],
            ['페인터 팬츠', '캔버스 스니커즈', '포켓 티셔츠', '트러커 캡'],
            ['와이드 치노 팬츠', '모카신', '데님 셔츠', '반다나 두건'],
        ],
    },
    'OUTDOOR ARCHIVE': {
        description: '고프코어·테크웨어 기반의 아웃도어 시티룩. 한국 20-30대 등산복 일상화 트렌드 (살로몬, 아크테릭스 감성)',
        coordiItems: [
            ['테크 조거 팬츠', '살로몬 XT-6', '플리스 집업', '메신저백'],
            ['나일론 카고 팬츠', '호카 본디', '윈드브레이커', '버킷햇'],
            ['트레일 팬츠', '메렐 하이킹화', '경량 패딩 조끼', '사코슈 백'],
            ['스트레치 팬츠', '살로몬 스피드크로스', '테크 반팔티', '바이저 캡'],
        ],
    },
    'JAPANESE ARCHIVE': {
        description: '아메카지·시부야 캐주얼 기반의 일본식 빈티지 스타일링. 한국 20-30대 일본감성 코디 (오카야마 데님, 비즈빔 감성)',
        coordiItems: [
            ['셀비지 스트레이트 데님', '올드스쿨 스니커즈', '보더 스트라이프 티', '토트백'],
            ['와이드 치노', '캔버스 잭퍼셀', '옥스포드 버튼다운', '가죽 시계'],
            ['베이커 팬츠', '클라크스 데저트부츠', '무지 포켓 티', '데님 토트'],
            ['플리티드 팬츠', '뉴발란스 1906R', '니트 가디건', '캔버스 숄더백'],
        ],
    },
    'HERITAGE EUROPE': {
        description: '유럽 클래식·올드머니 기반의 프레피 스타일링. 한국 20-30대 올드머니룩 트렌드 (로로피아나, 부르넬로 쿠치넬리 감성)',
        coordiItems: [
            ['슬림 울 슬랙스', '로퍼', '캐시미어 니트', '가죽 벨트'],
            ['플리티드 팬츠', '더비 슈즈', '스트라이프 셔츠', '실크 스카프'],
            ['와이드 울 팬츠', '스웨이드 첼시부츠', '터틀넥', '울 코트'],
            ['크림 치노', '화이트 스니커즈', '폴로 셔츠', '토트백'],
        ],
    },
    'BRITISH ARCHIVE': {
        description: '브리티시 헤리티지·모드 기반 클래식 스타일링. 한국 20-30대 브리티시 무드 트렌드 (버버리, 바버 감성)',
        coordiItems: [
            ['울 트라우저', '더비 브로그', '타탄체크 셔츠', '니트 타이'],
            ['코듀로이 팬츠', '첼시 부츠', '크루넥 니트', '울 베레모'],
            ['트위드 팬츠', '위켄더 로퍼', '옥스포드 셔츠', '가죽 크로스백'],
            ['스트레이트 데님', '닥터마틴 1461', '피셔맨 니트', '뉴스보이캡'],
        ],
    },
    'UNISEX ARCHIVE': {
        description: '아메리칸 캐주얼·스트릿 기반의 유니섹스 스타일링. 한국 20-30대 스트릿 캐주얼 트렌드',
        coordiItems: [
            ['와이드 데님', '나이키 덩크', '그래픽 티셔츠', '볼캡'],
            ['스웻 팬츠', '아디다스 삼바', '크루넥 스웻셔츠', '미니 크로스백'],
            ['카고 팬츠', '컨버스 척테일러', '후드티', '비니'],
            ['스트레이트 팬츠', '뉴발란스 993', '럭비 셔츠', '토트백'],
        ],
    },
};

const FALLBACK_DEFAULT_STYLING = {
    description: '한국 20-30대 캐주얼 트렌드. 성수동·홍대 기반의 세련된 데일리룩',
    coordiItems: [
        ['스트레이트 데님', '뉴발란스 530', '크루넥 티셔츠', '미니 크로스백'],
        ['와이드 슬랙스', '로퍼', '오버사이즈 셔츠', '가죽 벨트'],
        ['카고 팬츠', '나이키 에어포스1', '후드집업', '볼캡'],
        ['치노 팬츠', '아디다스 삼바', '카디건', '토트백'],
    ],
};

const FALLBACK_GENDER_DESCRIPTIONS: Record<string, string> = {
    MAN: '한국인 남성 모델 (20대 중반, 키 178cm, 요즘 트렌드와 옷의 특징에 어울리는 체형과 핏)',
    WOMAN: '한국인 여성 모델 (20대 중반, 키 168cm, 요즘 트렌드와 옷의 특징에 어울리는 체형과 핏)',
    KIDS: '한국인 아동 모델 (8-10세, 밝고 활발한 표정, 깔끔한 스타일)',
};

const FALLBACK_GENDER_STYLE_TIPS: Record<string, string> = {
    MAN: '남성 코디: 무신사 스냅, 하이버 스타일링처럼 깔끔하면서도 트렌디한 시티보이 감성. 오버사이즈+슬림 밸런스, 뉴트럴 톤 위주',
    WOMAN: '여성 코디: W컨셉, 29CM 스타일링처럼 미니멀하면서 세련된 감성. 적절한 실루엣 대비, 톤온톤 또는 포인트 컬러',
    KIDS: '아동 코디: 밝고 활발한 컬러감, 편안하면서 세련된 캐주얼',
};

const FALLBACK_MAIN_PROMPT = `You are a top-tier Korean fashion e-commerce studio photographer.

[INPUT IMAGES]
- Image 1: Reference model photo (use this person's face, body type, and pose)
- Image 2: THE PRODUCT clothing to sell (this garment MUST be worn by the model — THIS IS THE MAIN PRODUCT!)

[TASK]
Generate a professional e-commerce product photo of a {{genderKR}} model wearing the clothing from Image 2.
{{productNameLine}}

★★★ CRITICAL RULE — THE PRODUCT FROM IMAGE 2 MUST BE THE MOST PROMINENT ITEM IN THE PHOTO ★★★
- If the product is a TOP (t-shirt, shirt, sweater): DO NOT add any jacket, coat, or outer layer. The top must be 100% visible from front. NO layering on top.
- If the product is OUTERWEAR (jacket, coat): The outerwear must be the hero piece. Keep inner layers minimal and plain.
- If the product is BOTTOMS (pants, skirt): The entire bottom garment must be fully visible. Use a short/cropped top so nothing covers the bottoms.
- Coordinating items are SUPPORTING ONLY — they must NEVER be more visually prominent than the product.
- NEVER add clothing items that obscure, cover, or compete with the product garment.

[MODEL SETUP]
{{genderDesc}}

[STYLING DIRECTION — Korean Fashion Platform Reference]
- Concept: {{stylingDescription}}
- Coordinate with: {{coordiText}}
- For TOP products: Match ONLY with bottoms + shoes + accessories. ABSOLUTELY NO jackets or outerwear over the product.
- For BOTTOM products: Match with a SHORT cropped top + shoes + accessories. The entire length of bottoms must be visible.
- For OUTERWEAR products: Match with simple inner + bottoms + shoes. Outerwear is the main visual focus.
- Reference: Korean fashion platforms (Musinsa, 29CM, W Concept) 2024-2025 best styling sets
- {{genderStyleTip}}
- Realistic daily look that Korean 20-30s would actually wear (Instagram-worthy)
- Color coordination: Supporting items should complement the product color in muted tones, never outshine it

[MANDATORY PHOTO REQUIREMENTS — STRICT]
1. ★ SQUARE (1:1) aspect ratio image — NOT portrait, NOT landscape
2. PURE WHITE (#FFFFFF) studio background — no props, no floor lines, no shadows on background. Clean infinite white.
3. FULL BODY shot with GENEROUS margins — at least 15-20% white space above head and below feet. Model centered.
4. Soft diffused studio lighting, minimal shadows, professional fashion photography lighting setup
5. Model looking STRAIGHT into camera lens at eye level — not looking up or down
6. EXACT reproduction of the product garment's color, pattern, texture, and details (buttons, zippers, logos) from Image 2 — DO NOT alter or reimagine the garment
7. Photorealistic fabric texture, accurate color reproduction, natural fit appropriate for current trends
8. Professional fashion e-commerce quality (Musinsa, 29CM product detail image standard)
9. ★ THE PRODUCT GARMENT MUST BE THE VISUAL HERO — it should occupy the most visual attention. No other item should compete.
10. High resolution, sharp details, commercial photography quality

Generate the image now.`;

// DB에서 프롬프트 설정 로드 (캐시 포함)
let cachedConfig: PromptConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1분 캐시

let lastPromptSource: 'db' | 'default' = 'default';

async function loadPromptConfig(): Promise<PromptConfig> {
    // 캐시가 유효하면 반환
    if (cachedConfig && (Date.now() - cacheTime) < CACHE_TTL) {
        return cachedConfig;
    }

    try {
        const res = await db.query(
            `SELECT value FROM system_settings WHERE key = 'fitting_prompt_config'`
        );

        if (res.rows.length > 0) {
            const config = typeof res.rows[0].value === 'string'
                ? JSON.parse(res.rows[0].value)
                : res.rows[0].value;
            cachedConfig = config;
            cacheTime = Date.now();
            lastPromptSource = 'db';
            console.log('[FittingPrompt] DB 커스텀 프롬프트 로드 완료');
            return config;
        }
    } catch (e) {
        console.warn('[FittingPrompt] DB 로드 실패, 기본값 사용:', e);
    }

    // DB에 없으면 하드코딩 기본값 반환
    lastPromptSource = 'default';
    console.log('[FittingPrompt] DB에 커스텀 설정 없음, 기본값 사용');
    return {
        mainPrompt: FALLBACK_MAIN_PROMPT,
        genderDescriptions: FALLBACK_GENDER_DESCRIPTIONS,
        genderStyleTips: FALLBACK_GENDER_STYLE_TIPS,
        categoryStyling: FALLBACK_CATEGORY_STYLING,
        defaultStyling: FALLBACK_DEFAULT_STYLING,
    };
}

// 프롬프트 소스 정보 조회 (로그 표시용)
export function getLastPromptSource(): 'db' | 'default' {
    return lastPromptSource;
}

// 프롬프트 빌드 (DB 설정 기반)
async function buildPrompt(
    gender: 'MAN' | 'WOMAN' | 'KIDS',
    archiveCategory?: string,
    productName?: string,
    variationSeed?: number
): Promise<string> {
    const config = await loadPromptConfig();

    const styling = (archiveCategory && config.categoryStyling[archiveCategory]) || config.defaultStyling;

    // variationSeed로 다른 코디 아이템 세트 선택
    const seed = variationSeed ?? Math.floor(Math.random() * styling.coordiItems.length);
    const coordiSet = styling.coordiItems[seed % styling.coordiItems.length];
    const coordiText = coordiSet.join(', ');

    const genderKR = gender === 'MAN' ? '남성' : gender === 'WOMAN' ? '여성' : '아동';
    const genderDesc = config.genderDescriptions[gender] || FALLBACK_GENDER_DESCRIPTIONS[gender];
    const genderStyleTip = config.genderStyleTips[gender] || FALLBACK_GENDER_STYLE_TIPS[gender];

    // 템플릿 변수 치환
    return config.mainPrompt
        .replace(/\{\{genderKR\}\}/g, genderKR)
        .replace(/\{\{productNameLine\}\}/g, productName ? `상품명: ${productName}` : '')
        .replace(/\{\{genderDesc\}\}/g, genderDesc)
        .replace(/\{\{stylingDescription\}\}/g, styling.description)
        .replace(/\{\{coordiText\}\}/g, coordiText)
        .replace(/\{\{genderStyleTip\}\}/g, genderStyleTip);
}

// 메인 생성 함수 - Gemini 이미지 생성
export async function generateFittingImage(request: FittingRequest): Promise<FittingResult> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가해주세요.');
    }

    const modelName = MODELS[request.modelChoice] || MODELS.flash;
    const prompt = await buildPrompt(
        request.gender,
        request.archiveCategory,
        request.productName,
        request.variationSeed
    );

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: request.personImageBase64,
                            },
                        },
                        { text: 'Above is the REFERENCE MODEL photo. Below is THE PRODUCT GARMENT that must be worn by the model. This product must be the MOST PROMINENT item in the final image:' },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: request.clothingImageBase64,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
                temperature: 1.0,
                imageConfig: {
                    aspectRatio: '1:1',
                },
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        const errMsg = data.error?.message || JSON.stringify(data);
        throw new Error(`Gemini API 오류: ${errMsg}`);
    }

    // 응답에서 이미지 추출
    const parts = data.candidates?.[0]?.content?.parts || [];
    let imageBase64 = '';
    let mimeType = 'image/png';
    let textResponse = '';

    for (const part of parts) {
        if (part.inlineData) {
            imageBase64 = part.inlineData.data || '';
            mimeType = part.inlineData.mimeType || 'image/png';
        } else if (part.text) {
            textResponse += part.text;
        }
    }

    if (!imageBase64) {
        const blockReason = data.candidates?.[0]?.finishReason;
        throw new Error(`이미지 생성 실패 (${blockReason || '알 수 없는 이유'}): ${textResponse || '응답 없음'}`);
    }

    // 후처리: 정사각형(1:1)으로 강제 변환 (흰 배경 패딩)
    const squareResult = await ensureSquareImage(imageBase64, mimeType);

    return {
        imageBase64: squareResult.base64,
        mimeType: squareResult.mimeType,
        textResponse: textResponse || undefined,
    };
}

// 이미지를 정사각형으로 변환 (흰색 패딩 추가)
async function ensureSquareImage(base64: string, inputMimeType: string): Promise<{ base64: string; mimeType: string }> {
    try {
        const inputBuffer = Buffer.from(base64, 'base64');
        const metadata = await sharp(inputBuffer).metadata();
        const w = metadata.width || 1024;
        const h = metadata.height || 1024;

        // 이미 정사각형이면 그대로 반환
        if (Math.abs(w - h) <= 2) {
            return { base64, mimeType: inputMimeType };
        }

        const size = Math.max(w, h);
        const outputBuffer = await sharp(inputBuffer)
            .resize(w, h, { fit: 'inside', withoutEnlargement: true })
            .extend({
                top: Math.floor((size - h) / 2),
                bottom: Math.ceil((size - h) / 2),
                left: Math.floor((size - w) / 2),
                right: Math.ceil((size - w) / 2),
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 95 })
            .toBuffer();

        console.log(`[FittingImage] 정사각형 변환: ${w}x${h} → ${size}x${size} (JPEG)`);
        return { base64: outputBuffer.toString('base64'), mimeType: 'image/jpeg' };
    } catch (e) {
        console.warn('[FittingImage] 정사각형 변환 실패, 원본 반환:', e);
        return { base64, mimeType: inputMimeType };
    }
}

// 이미지를 base64로 변환 (URL에서 다운로드)
export async function fetchImageAsBase64(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`이미지 다운로드 실패: ${res.status}`);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

// 성별 자동 감지
export function extractGender(productName: string): 'MAN' | 'WOMAN' | 'KIDS' {
    const match = productName.match(/(MAN|WOMAN|KIDS|UNISEX)-\S+$/);
    if (match) {
        if (match[1] === 'UNISEX') return 'MAN';
        return match[1] as 'MAN' | 'WOMAN' | 'KIDS';
    }
    return 'MAN';
}
