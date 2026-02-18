import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

export interface FittingRequest {
    personImageBase64: string;      // 모델 사진 (참고용)
    clothingImageBase64: string;    // 상품 의류 이미지
    gender: 'MAN' | 'WOMAN' | 'KIDS';
    clothingType?: string;
    archiveCategory?: string;
    modelChoice: 'flash' | 'pro';   // flash=standard, pro=hd
    productName?: string;
}

export interface FittingResult {
    imageBase64: string;
    mimeType: string;
    textResponse?: string;
}

const CATEGORY_STYLE_HINTS: Record<string, string> = {
    'MILITARY ARCHIVE': 'military-inspired urban styling with cargo pants or combat boots',
    'WORKWEAR ARCHIVE': 'workwear aesthetic with utility details, denim, and rugged accessories',
    'OUTDOOR ARCHIVE': 'technical outdoor styling with layered functional pieces',
    'JAPANESE ARCHIVE': 'Japanese amekaji style with refined casual layering',
    'HERITAGE EUROPE': 'European luxury vintage styling with sophisticated tailoring',
    'BRITISH ARCHIVE': 'British heritage styling with classic patterns and refined details',
    'UNISEX ARCHIVE': 'American casual relaxed everyday styling',
};

// Step 1: GPT-4o Vision으로 의류 이미지 분석 → 상세 설명 추출
async function analyzeClothingImage(openai: OpenAI, clothingBase64: string, productName?: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `이 의류 상품의 사진을 분석해서 DALL-E 3 프롬프트에 사용할 수 있도록 매우 상세하게 영어로 설명해주세요.
${productName ? `상품명: ${productName}` : ''}

다음 항목을 모두 포함해주세요:
1. 의류 종류 (jacket, pants, shirt, coat 등)
2. 정확한 색상과 패턴 (체크, 스트라이프, 무지 등)
3. 소재/텍스처 (울, 데님, 코튼, 나일론 등)
4. 디테일 (버튼, 지퍼, 포켓, 자수, 로고 등)
5. 핏/실루엣 (오버사이즈, 슬림핏, 릴렉스드 등)
6. 특징적 디자인 요소

한 문단으로 자연스럽게 설명해주세요. "A" 또는 "The"로 시작하는 영어 문장으로.`
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:image/jpeg;base64,${clothingBase64}`,
                        detail: 'high',
                    }
                }
            ]
        }],
        max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'a vintage clothing item';
}

// Step 2: DALL-E 3로 모델 착용 이미지 생성
async function generateWithDalle3(
    openai: OpenAI,
    clothingDescription: string,
    gender: 'MAN' | 'WOMAN' | 'KIDS',
    archiveCategory?: string,
    quality: 'standard' | 'hd' = 'standard'
): Promise<{ imageBase64: string; revisedPrompt: string }> {
    const genderDesc = gender === 'MAN'
        ? 'a Korean male model in his mid-20s with a slim, tall build and clean-cut appearance'
        : gender === 'WOMAN'
        ? 'a Korean female model in her mid-20s with a slim figure and natural, elegant appearance'
        : 'a Korean child model aged 8-10 with a cute, energetic appearance';

    const styleHint = archiveCategory ? CATEGORY_STYLE_HINTS[archiveCategory] || '' : '';
    const trendContext = gender === 'KIDS'
        ? 'styled in a trendy way popular among Korean parents for children'
        : 'styled in the latest Korean fashion trends popular among people in their 20s to 30s';

    const prompt = `Commercial e-commerce full-body photograph of ${genderDesc}, standing straight facing directly at the camera in a pure white studio background.

The model is wearing: ${clothingDescription}

The outfit is ${trendContext}. ${styleHint ? `The overall styling direction is ${styleHint}.` : ''} The model coordinates the main clothing item with complementary pieces that create a complete, fashionable look.

PHOTOGRAPHY REQUIREMENTS:
- Pure white studio background with no props or distractions
- Full-body shot from head to toe, model standing upright facing the camera
- Natural studio lighting that looks like natural daylight
- Model gazes directly at the camera with a confident, natural expression
- Ultra high quality commercial fashion photography
- The clothing details must be accurately represented without any AI distortion
- Realistic fabric texture, color accuracy, and proper fit on the model's body
- Professional fashion e-commerce product photography standard
- 3:4 aspect ratio portrait orientation`;

    const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1792',
        quality,
        response_format: 'b64_json',
    });

    const imageData = response.data[0];
    if (!imageData?.b64_json) {
        throw new Error('DALL-E 3에서 이미지를 반환하지 않았습니다');
    }

    return {
        imageBase64: imageData.b64_json,
        revisedPrompt: imageData.revised_prompt || '',
    };
}

// 메인 생성 함수 (2단계: 분석 → 생성)
export async function generateFittingImage(request: FittingRequest): Promise<FittingResult> {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가해주세요.');
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Step 1: GPT-4o로 의류 이미지 분석
    const clothingDescription = await analyzeClothingImage(
        openai,
        request.clothingImageBase64,
        request.productName
    );

    // Step 2: DALL-E 3로 이미지 생성
    const quality = request.modelChoice === 'pro' ? 'hd' : 'standard';
    const { imageBase64, revisedPrompt } = await generateWithDalle3(
        openai,
        clothingDescription,
        request.gender,
        request.archiveCategory,
        quality
    );

    return {
        imageBase64,
        mimeType: 'image/png',
        textResponse: `의류 분석: ${clothingDescription}\n\nDALL-E 프롬프트: ${revisedPrompt}`,
    };
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
