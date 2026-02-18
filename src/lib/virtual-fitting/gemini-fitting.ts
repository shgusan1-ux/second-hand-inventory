import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface FittingRequest {
    personImageBase64: string;
    clothingImageBase64: string;
    gender: 'MAN' | 'WOMAN' | 'KIDS';
    clothingType?: string;
    archiveCategory?: string;
    modelChoice: 'flash' | 'pro';
}

export interface FittingResult {
    imageBase64: string;
    mimeType: string;
    textResponse?: string;
}

const CATEGORY_STYLE_HINTS: Record<string, string> = {
    'MILITARY ARCHIVE': '밀리터리 스타일 - 자신감 있는 포즈, 어반 아웃도어 무드',
    'WORKWEAR ARCHIVE': '워크웨어 에스테틱 - 릴렉스드, 유틸리테리안 컨피던스',
    'OUTDOOR ARCHIVE': '아웃도어/테크니컬 - 액티브 라이프스타일',
    'JAPANESE ARCHIVE': '재팬 아메카지 스타일 - 레이어드, 정제된 캐주얼',
    'HERITAGE EUROPE': '유러피안 럭셔리 - 우아한 포즈, 소피스티케이트',
    'BRITISH ARCHIVE': '브리티시 헤리티지 - 클래식, 디스팅귀시드',
    'UNISEX ARCHIVE': '아메리칸 캐주얼 - 릴렉스드, 에브리데이 웨어러블',
};

function buildPrompt(gender: string, clothingType?: string, archiveCategory?: string): string {
    const genderKo = gender === 'MAN' ? '남성' : gender === 'WOMAN' ? '여성' : '아동';
    const styleHint = archiveCategory ? CATEGORY_STYLE_HINTS[archiveCategory] || archiveCategory : '';

    return `You are a professional fashion photographer creating a virtual try-on image for a Korean second-hand vintage clothing e-commerce store.

TASK: Dress the person (first image) in the clothing item (second image). Generate a photorealistic image of the person wearing this clothing.

CRITICAL RULES:
1. FACE: Keep the person's face IDENTICAL - same features, expression, skin tone
2. BODY: Maintain exact body proportions and natural pose
3. CLOTHING FIT: The clothing should fit naturally, showing realistic draping, wrinkles, creases
4. TEXTURE: Preserve the clothing's exact color, pattern, texture, and any vintage wear
5. LIGHTING: Professional studio lighting, soft shadows, neutral light gray background
6. STYLE: Editorial e-commerce photography suitable for Naver SmartStore
7. COMPOSITION: Upper-body to full-body shot, clothing clearly visible
8. VINTAGE CONTEXT: This is pre-owned clothing - slight natural wear is authentic

Gender: ${genderKo} model
${clothingType ? `Clothing type: ${clothingType}` : ''}
${styleHint ? `Style: ${styleHint}` : ''}

Generate ONE high-quality, photorealistic image.`;
}

export async function generateFittingImage(request: FittingRequest): Promise<FittingResult> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const modelId = request.modelChoice === 'pro'
        ? 'gemini-2.0-flash-exp'
        : 'gemini-2.0-flash-exp';
    // 참고: gemini-3-pro-image-preview / gemini-2.5-flash-image가 아직 미출시일 수 있음
    // 현재 사용 가능한 이미지 생성 모델로 대체

    const prompt = buildPrompt(request.gender, request.clothingType, request.archiveCategory);

    const response = await ai.models.generateContent({
        model: modelId,
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: request.personImageBase64 } },
                { inlineData: { mimeType: 'image/jpeg', data: request.clothingImageBase64 } },
            ],
        }],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let imageBase64 = '';
    let mimeType = 'image/png';
    let textResponse = '';

    for (const part of parts) {
        if (part.inlineData) {
            imageBase64 = part.inlineData.data || '';
            mimeType = part.inlineData.mimeType || 'image/png';
        }
        if (part.text) {
            textResponse = part.text;
        }
    }

    if (!imageBase64) {
        throw new Error('Gemini에서 이미지를 반환하지 않았습니다' + (textResponse ? `: ${textResponse}` : ''));
    }

    return { imageBase64, mimeType, textResponse };
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
    return 'MAN'; // 기본값
}
