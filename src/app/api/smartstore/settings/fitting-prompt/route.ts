import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/db-init';

const SETTING_KEY = 'fitting_prompt_config';

// 기본 프롬프트 설정
const DEFAULT_CONFIG = {
    // 메인 프롬프트 템플릿 (영어 - Gemini가 영어 지시를 더 잘 따름)
    mainPrompt: `You are a top-tier Korean fashion e-commerce studio photographer.

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

Generate the image now.`,

    // 성별별 모델 설명
    genderDescriptions: {
        MAN: 'Korean male model (mid-20s, 178cm tall, body type and fit matching current trends)',
        WOMAN: 'Korean female model (mid-20s, 168cm tall, body type and fit matching current trends)',
        KIDS: 'Korean child model (8-10 years old, bright and cheerful expression, clean style)',
    },

    // 성별별 스타일 팁
    genderStyleTips: {
        MAN: 'Men styling: Clean yet trendy city-boy aesthetic like Musinsa Snap. Oversized+slim balance, neutral tones',
        WOMAN: 'Women styling: Minimal yet refined aesthetic like W Concept, 29CM. Balanced silhouettes, tone-on-tone or accent color',
        KIDS: 'Kids styling: Bright cheerful colors, comfortable yet stylish casual',
    },

    // 카테고리별 코디 스타일링
    categoryStyling: {
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
    },

    // 기본 코디 (카테고리 없을 때)
    defaultStyling: {
        description: '한국 20-30대 캐주얼 트렌드. 성수동·홍대 기반의 세련된 데일리룩',
        coordiItems: [
            ['스트레이트 데님', '뉴발란스 530', '크루넥 티셔츠', '미니 크로스백'],
            ['와이드 슬랙스', '로퍼', '오버사이즈 셔츠', '가죽 벨트'],
            ['카고 팬츠', '나이키 에어포스1', '후드집업', '볼캡'],
            ['치노 팬츠', '아디다스 삼바', '카디건', '토트백'],
        ],
    },
};

// GET: 현재 프롬프트 설정 조회
export async function GET() {
    try {
        await ensureDbInitialized();

        const res = await db.query(
            `SELECT value FROM system_settings WHERE key = $1`,
            [SETTING_KEY]
        );

        if (res.rows.length === 0) {
            return NextResponse.json({ success: true, config: DEFAULT_CONFIG, isDefault: true });
        }

        const config = typeof res.rows[0].value === 'string'
            ? JSON.parse(res.rows[0].value)
            : res.rows[0].value;

        return NextResponse.json({ success: true, config, isDefault: false });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: 프롬프트 설정 저장
export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const config = await request.json();
        const value = JSON.stringify(config);

        await db.query(
            `INSERT INTO system_settings (key, value)
             VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET
                value = $2,
                updated_at = CURRENT_TIMESTAMP`,
            [SETTING_KEY, value]
        );

        return NextResponse.json({ success: true, message: '프롬프트 설정이 저장되었습니다.' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: 기본값으로 초기화
export async function DELETE() {
    try {
        await ensureDbInitialized();

        await db.query(
            `DELETE FROM system_settings WHERE key = $1`,
            [SETTING_KEY]
        );

        return NextResponse.json({ success: true, message: '기본값으로 초기화되었습니다.', config: DEFAULT_CONFIG });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
