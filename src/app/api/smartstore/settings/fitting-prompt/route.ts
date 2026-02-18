import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/db-init';

const SETTING_KEY = 'fitting_prompt_config';

// 기본 프롬프트 설정
const DEFAULT_CONFIG = {
    // 메인 프롬프트 템플릿
    mainPrompt: `당신은 한국 최고의 패션 이커머스 스튜디오 포토그래퍼입니다.

[입력 이미지 설명]
- 첫 번째 이미지: 참고용 모델 사진 (이 사람의 얼굴, 체형, 포즈를 참고)
- 두 번째 이미지: 실제 판매할 의류 상품 사진 (이 옷을 모델에게 입혀야 함 - 이 상품이 메인!)

[작업 목표]
{{genderKR}} 모델이 두 번째 이미지의 옷을 입고 있는 전문 이커머스 상품 사진을 생성하세요.
{{productNameLine}}

★★★ 가장 중요: 두 번째 이미지의 상품 의류가 사진에서 가장 눈에 띄고 부각되어야 합니다!
- 상품이 티셔츠라면: 자켓으로 가려지면 안 됨. 티셔츠가 전면에 완전히 보여야 함
- 상품이 아우터라면: 아우터가 열려서 이너가 더 눈에 띄면 안 됨. 아우터가 메인
- 상품이 하의라면: 상의가 너무 길어서 하의를 가리면 안 됨. 하의 전체가 보여야 함
- 코디 아이템은 상품을 돋보이게 하는 보조 역할일 뿐, 절대 상품보다 눈에 띄면 안 됨

[모델 설정]
{{genderDesc}}

[스타일링 방향 - 한국 패션 쇼핑몰 코디 참고]
- 컨셉: {{stylingDescription}}
- 코디 아이템: 상품 의류와 함께 {{coordiText}}을 매치
- 상품이 상의인 경우: 상의가 완전히 드러나도록! 위의 코디 아이템 중 하의/신발/액세서리만 매치. 자켓이나 아우터로 상의를 가리지 말 것
- 상품이 하의인 경우: 하의 전체가 보이도록! 위의 코디 아이템 중 상의/신발/액세서리를 매치. 상의 기장이 짧은 것을 선택할 것
- 상품이 아우터인 경우: 아우터가 메인으로 보이도록! 심플한 이너/하의/신발을 매치
- 코디 참고 기준: 한국 대표 패션 플랫폼(무신사 스토어, 29CM, W컨셉, 하이버, SSF샵)의 2024-2025 베스트 코디셋을 참고
- {{genderStyleTip}}
- 전체적으로 한국 20-30대가 실제 입고 다닐 법한 현실적인 코디 (SNS 인스타그램에 올릴만한 데일리룩)
- 컬러 매칭: 코디 아이템은 상품 의류의 색상과 조화되되, 상품보다 튀지 않는 톤다운된 컬러로

[절대 지켜야 할 촬영 요구사항]
1. ★ 정사각형(1:1) 비율 이미지 생성 (직사각형 아님!)
2. 순백색 스튜디오 배경 (소품, 배경 장식 일체 없음). 모델 주변에 충분한 흰색 여백을 확보할 것 (상하좌우 최소 20% 이상 여백)
3. 전신 사진 (머리 위 여유 공간 ~ 발끝 아래 여유 공간까지). 모델이 이미지 중앙에 서 있고, 머리 위와 발 아래에 넉넉한 여백이 있어야 함
4. 자연광 느낌의 스튜디오 조명 (그림자 최소화, 소프트 디퓨즈드 라이팅)
5. 모델의 시선: 카메라 렌즈를 정확히 똑바로 바라봐야 함. 아래를 내려다보거나 위를 올려다보면 안 됨. 눈높이와 카메라가 정확히 같은 높이에서 정면 응시 (eye-level straight gaze into camera lens)
6. 의류 상품의 색상, 패턴, 질감, 디테일(버튼, 지퍼, 로고 등)을 원본과 동일하게 표현 - AI가 임의로 변형하지 않을 것
7. 사실적인 원단 질감, 정확한 색상 재현, 옷의 특징과 요즘 트렌드에 맞는 자연스러운 핏
8. 전문 패션 이커머스 상품 촬영 수준의 고품질 (무신사, 29CM 상품 상세 이미지 수준)
9. ★ 코디하려는 상품 의류가 사진에서 가장 부각되어야 함. 다른 코디 아이템에 의해 가려지거나 묻히면 절대 안 됨!

지금 이미지를 생성하세요.`,

    // 성별별 모델 설명
    genderDescriptions: {
        MAN: '한국인 남성 모델 (20대 중반, 키 178cm, 요즘 트렌드와 옷의 특징에 어울리는 체형과 핏)',
        WOMAN: '한국인 여성 모델 (20대 중반, 키 168cm, 요즘 트렌드와 옷의 특징에 어울리는 체형과 핏)',
        KIDS: '한국인 아동 모델 (8-10세, 밝고 활발한 표정, 깔끔한 스타일)',
    },

    // 성별별 스타일 팁
    genderStyleTips: {
        MAN: '남성 코디: 무신사 스냅, 하이버 스타일링처럼 깔끔하면서도 트렌디한 시티보이 감성. 오버사이즈+슬림 밸런스, 뉴트럴 톤 위주',
        WOMAN: '여성 코디: W컨셉, 29CM 스타일링처럼 미니멀하면서 세련된 감성. 적절한 실루엣 대비, 톤온톤 또는 포인트 컬러',
        KIDS: '아동 코디: 밝고 활발한 컬러감, 편안하면서 세련된 캐주얼',
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
