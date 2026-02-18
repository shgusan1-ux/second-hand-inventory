
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// 모델 이름: flash=빠르고 저렴, pro=고품질
const MODELS = {
    flash: 'gemini-2.0-flash-exp',
    pro: 'gemini-2.0-flash-exp',
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

// 아카이브 카테고리별 한국 트렌드 코디 스타일링 가이드
const CATEGORY_STYLING: Record<string, { description: string; coordiItems: string[][] }> = {
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

// 기본 코디 (카테고리 없을 때)
const DEFAULT_STYLING = {
    description: '한국 20-30대 캐주얼 트렌드. 성수동·홍대 기반의 세련된 데일리룩',
    coordiItems: [
        ['스트레이트 데님', '뉴발란스 530', '크루넥 티셔츠', '미니 크로스백'],
        ['와이드 슬랙스', '로퍼', '오버사이즈 셔츠', '가죽 벨트'],
        ['카고 팬츠', '나이키 에어포스1', '후드집업', '볼캡'],
        ['치노 팬츠', '아디다스 삼바', '카디건', '토트백'],
    ],
};

function buildPrompt(
    gender: 'MAN' | 'WOMAN' | 'KIDS',
    archiveCategory?: string,
    productName?: string,
    variationSeed?: number
): string {
    const styling = (archiveCategory && CATEGORY_STYLING[archiveCategory]) || DEFAULT_STYLING;

    // variationSeed로 다른 코디 아이템 세트 선택
    const seed = variationSeed ?? Math.floor(Math.random() * styling.coordiItems.length);
    const coordiSet = styling.coordiItems[seed % styling.coordiItems.length];
    const coordiText = coordiSet.join(', ');

    const genderKR = gender === 'MAN' ? '남성' : gender === 'WOMAN' ? '여성' : '아동';
    const genderDesc = gender === 'MAN'
        ? '한국인 남성 모델 (20대 중반, 키 178cm, 슬림핏 체형, 깔끔한 헤어스타일, 자연스러운 표정)'
        : gender === 'WOMAN'
        ? '한국인 여성 모델 (20대 중반, 키 168cm, 슬림핏 체형, 자연스러운 헤어, 세련된 표정)'
        : '한국인 아동 모델 (8-10세, 밝고 활발한 표정, 깔끔한 스타일)';

    return `당신은 한국 최고의 패션 이커머스 스튜디오 포토그래퍼입니다.

[입력 이미지 설명]
- 첫 번째 이미지: 참고용 모델 사진 (이 사람의 얼굴, 체형을 참고)
- 두 번째 이미지: 실제 판매할 의류 상품 사진 (이 옷을 모델에게 입혀야 함)

[작업 목표]
${genderKR} 모델이 두 번째 이미지의 옷을 입고 있는 전문 이커머스 상품 사진을 생성하세요.
${productName ? `상품명: ${productName}` : ''}

[모델 설정]
${genderDesc}

[스타일링 방향 - 한국 패션 쇼핑몰 코디 참고]
- 컨셉: ${styling.description}
- 코디 아이템: 상품 의류와 함께 ${coordiText}을 매치
- 상품이 상의인 경우: 위의 코디 아이템 중 하의/신발/액세서리를 자연스럽게 매치
- 상품이 하의인 경우: 위의 코디 아이템 중 상의/신발/액세서리를 자연스럽게 매치
- 상품이 아우터인 경우: 이너/하의/신발을 위 코디 아이템에서 자연스럽게 매치
- 코디 참고 기준: 한국 대표 패션 플랫폼(무신사 스토어, 29CM, W컨셉, 하이버, SSF샵)의 2024-2025 베스트 코디셋을 참고
- ${gender === 'MAN' ? '남성 코디: 무신사 스냅, 하이버 스타일링처럼 깔끔하면서도 트렌디한 시티보이 감성. 오버사이즈+슬림 밸런스, 뉴트럴 톤 위주' : gender === 'WOMAN' ? '여성 코디: W컨셉, 29CM 스타일링처럼 미니멀하면서 세련된 감성. 적절한 실루엣 대비, 톤온톤 또는 포인트 컬러' : '아동 코디: 밝고 활발한 컬러감, 편안하면서 세련된 캐주얼'}
- 전체적으로 한국 20-30대가 실제 입고 다닐 법한 현실적인 코디 (SNS 인스타그램에 올릴만한 데일리룩)
- 컬러 매칭: 메인 의류의 색상과 조화되는 보색/유사색 코디 (너무 튀지 않게)

[절대 지켜야 할 촬영 요구사항]
1. 순백색 스튜디오 배경 (소품, 배경 장식 일체 없음). 모델 주변에 충분한 흰색 여백을 확보할 것 (상하좌우 최소 15% 이상 여백)
2. 전신 사진 (머리 위 여유 공간 ~ 발끝 아래 여유 공간까지). 모델이 이미지 중앙에 서 있고, 머리 위와 발 아래에 넉넉한 여백이 있어야 함
3. 자연광 느낌의 스튜디오 조명 (그림자 최소화, 소프트 디퓨즈드 라이팅)
4. 모델의 시선: 카메라 렌즈를 정확히 똑바로 바라봐야 함. 아래를 내려다보거나 위를 올려다보면 안 됨. 눈높이와 카메라가 정확히 같은 높이에서 정면 응시 (eye-level straight gaze into camera lens)
5. 의류 상품의 색상, 패턴, 질감, 디테일(버튼, 지퍼, 로고 등)을 원본과 동일하게 표현 - AI가 임의로 변형하지 않을 것
6. 사실적인 원단 질감, 정확한 색상 재현, 모델 체형에 맞는 자연스러운 핏
7. 전문 패션 이커머스 상품 촬영 수준의 고품질 (무신사, 29CM 상품 상세 이미지 수준)
8. 세로(portrait) 방향 이미지, 모델이 프레임의 60-70%를 차지하고 나머지는 흰색 여백

지금 이미지를 생성하세요.`;
}

// 메인 생성 함수 - Gemini 이미지 생성
export async function generateFittingImage(request: FittingRequest): Promise<FittingResult> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가해주세요.');
    }

    const modelName = MODELS[request.modelChoice] || MODELS.flash;
    const prompt = buildPrompt(
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
                        { text: '위 사진이 참고용 모델 사진입니다. 아래 사진이 모델에게 입힐 의류 상품입니다:' },
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

    return {
        imageBase64,
        mimeType,
        textResponse: textResponse || undefined,
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
