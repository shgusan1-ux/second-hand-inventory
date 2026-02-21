/**
 * SNS 마케팅 콘텐츠 자동 생성기
 *
 * 지원 플랫폼: 인스타그램(피드/스토리), 페이스북, 네이버블로그, 당근마켓, 번개장터, 카카오톡채널
 * 콘텐츠 타입: AI 에디토리얼 이미지, 템플릿 카드, 캡션/해시태그
 */

import sharp from 'sharp';
import { fetchImageAsBase64 } from './ai-automation';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MD_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent';

// ─── 타입 정의 ───────────────────────────────────────────

export type SNSPlatform = 'instagram-feed' | 'instagram-story' | 'facebook' | 'naver-blog' | 'daangn' | 'bungae' | 'kakao';

export interface PlatformSpec {
    nameKr: string;
    width: number;
    height: number;
    aspectRatio: string;
    contentType: 'image+text' | 'text-only' | 'html';
}

export const PLATFORM_SPECS: Record<SNSPlatform, PlatformSpec> = {
    'instagram-feed':  { nameKr: '인스타그램 피드',   width: 1080, height: 1080, aspectRatio: '1:1',  contentType: 'image+text' },
    'instagram-story': { nameKr: '인스타그램 스토리', width: 1080, height: 1920, aspectRatio: '9:16', contentType: 'image+text' },
    'facebook':        { nameKr: '페이스북',         width: 1200, height: 630,  aspectRatio: '3:2',  contentType: 'image+text' },
    'naver-blog':      { nameKr: '네이버 블로그',    width: 860,  height: 0,    aspectRatio: '4:3',  contentType: 'html' },
    'daangn':          { nameKr: '당근마켓',         width: 0,    height: 0,    aspectRatio: '',     contentType: 'text-only' },
    'bungae':          { nameKr: '번개장터',         width: 0,    height: 0,    aspectRatio: '',     contentType: 'text-only' },
    'kakao':           { nameKr: '카카오톡 채널',    width: 800,  height: 400,  aspectRatio: '2:1',  contentType: 'image+text' },
};

export interface SNSProduct {
    id: string;
    name: string;
    brand: string;
    category: string;
    category_name?: string;
    price_sell: number;
    price_consumer: number;
    condition: string;
    image_url: string;
    size?: string;
    fabric?: string;
    md_comment?: string;
}

export interface SNSContentResult {
    platform: SNSPlatform;
    imageUrl?: string;
    caption?: string;
    hashtags?: string[];
    title?: string;
    htmlContent?: string;
}

// ─── 콘텐츠 카테고리 ────────────────────────────────

export type ContentCategory = 'brand-story' | 'behind-scenes' | 'product-feature';

export const CONTENT_CATEGORIES: Record<ContentCategory, { nameKr: string; desc: string; icon: string }> = {
    'brand-story':     { nameKr: '브랜드 스토리',    desc: '빈티지 트렌드, 브랜드 히스토리, 스타일링 팁, 아카이브 교육', icon: '📖' },
    'behind-scenes':   { nameKr: '비하인드 스토리',  desc: '오늘의 작업일지, 입고 뒷이야기, 셀러의 일상, 내부 비하인드', icon: '🎬' },
    'product-feature': { nameKr: '상품 소개',        desc: '개별 상품 소개, 신상 입고, 가격/등급 정보', icon: '🏷️' },
};

/**
 * 브랜드 콘텐츠 / 비하인드 콘텐츠 생성 (상품 불필요)
 * AI가 브라운스트리트의 브랜드 아이덴티티에 맞는 콘텐츠를 자동 생성
 */
export async function generateBrandContent(
    category: ContentCategory,
    platform: SNSPlatform,
    topic?: string // 사용자가 주제를 지정할 수 있음
): Promise<{ caption: string; hashtags: string[]; title?: string }> {
    const prompt = buildBrandContentPrompt(category, platform, topic);

    const response = await fetch(`${GEMINI_MD_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8 },
        }),
    });

    if (!response.ok) {
        return { caption: '콘텐츠 생성 실패', hashtags: ['#브라운스트리트', '#빈티지'] };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return { caption: '콘텐츠 생성 실패', hashtags: ['#브라운스트리트'] };

    try {
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch {
        return { caption: text, hashtags: extractHashtags(text) };
    }
}

function buildBrandContentPrompt(category: ContentCategory, platform: SNSPlatform, topic?: string): string {
    const store = `"브라운스트리트(Brownstreet)"는 성수동에 위치한 프리미엄 빈티지/아카이브 의류 셀렉트숍입니다. 90년대~2000년대 빈티지 의류를 큐레이션하여 네이버 스마트스토어에서 판매합니다. 브랜드 철학은 "옷에 담긴 시간의 가치를 재발견하는 것"입니다.`;

    const platformTone: Record<SNSPlatform, string> = {
        'instagram-feed': '감성적이고 시각적인 톤. 이모지 적절히 사용. 5줄 이내. 해시태그 15개.',
        'instagram-story': '짧고 캐주얼한 톤. 2~3줄. 해시태그 5개.',
        'facebook': '좀 더 설명적이고 정보가 풍부한 톤. 6~8줄. 해시태그 10개.',
        'naver-blog': 'SEO 최적화된 제목 + 블로그 도입부 4~5줄. 해시태그 10개.',
        'daangn': '친근한 동네 이웃 톤. 3줄 이내. 해시태그 없음.',
        'bungae': '깔끔하고 신뢰감 있는 톤. 3줄. 해시태그 5개.',
        'kakao': '짧고 임팩트 있는 메시지. 2줄. 해시태그 없음.',
    };

    const categoryPrompts: Record<ContentCategory, string> = {
        'brand-story': `브랜드 스토리 콘텐츠를 작성하세요. 다음 주제 중 하나를 선택하거나 ${topic ? `"${topic}" 주제로` : '자유롭게'} 작성하세요:
- 특정 브랜드의 히스토리와 빈티지 가치 (예: "90년대 NIKE ACG가 특별한 이유")
- 빈티지 패션 트렌드 분석 (예: "2026년 밀리터리 빈티지 열풍")
- 스타일링 팁 (예: "빈티지 데님 자켓 3가지 코디법")
- 아카이브 교육 (예: "빈티지 등급 S/A/B는 어떻게 결정될까?")
- 소재/원단 이야기 (예: "오래된 면이 더 좋은 이유")

★ 반드시 전문가적 시선으로 읽는 사람이 "몰랐던 사실"을 알게 되는 느낌이어야 합니다.
★ 브라운스트리트의 큐레이터 입장에서 서술하세요.`,

        'behind-scenes': `비하인드 스토리 콘텐츠를 작성하세요. ${topic ? `"${topic}" 주제로` : '다음 중 하나를 선택해서'} 작성하세요:
- 오늘의 작업일지 (예: "오늘 100벌 입고 — 그 중 진짜 보석 3벌")
- 입고/검수 뒷이야기 (예: "이 자켓을 보는 순간 심장이 뛰었다")
- 셀러의 솔직한 일상 (예: "비 오는 날 입고 분류하며 느낀 것")
- 내부 비하인드 (예: "브랜드 라벨만 보고 연도를 맞추는 방법")
- 실패/문제 해결 이야기 (예: "실크 셔츠 얼룩... 3시간 사투 끝에")
- 고객 에피소드 (예: "10년 전 팔았던 코트를 다시 찾으러 온 손님")

★ 가장 중요한 것은 "진정성". 기업 홍보가 아닌 한 사람의 이야기처럼 서술하세요.
★ 사소하지만 공감되는 디테일을 포함하세요.
★ 읽는 사람이 "나도 이런 경험 있다" 또는 "몰랐는데 신기하다"라고 느끼게 하세요.`,

        'product-feature': `상품 소개 콘텐츠를 작성하세요. ${topic ? `"${topic}" 주제로` : '새로운 입고 상품을 소개하는'} 형식으로 작성하세요:
- 이번 주 베스트 상품 소개
- 신규 입고 소식
- 가격대별/카테고리별 추천

★ 상품의 매력을 부각하되 과장하지 마세요. 솔직한 설명이 더 신뢰를 줍니다.`,
    };

    return `당신은 "${store}" 의 SNS 콘텐츠 크리에이터입니다.

${categoryPrompts[category]}

플랫폼: ${PLATFORMS[platform]?.nameKr || platform}
톤 & 형식: ${platformTone[platform]}

규칙:
1. 자연스러운 한국어로 작성
2. 광고/홍보 냄새가 나면 안 됨 — 진짜 사람이 쓴 것처럼
3. 브라운스트리트를 자연스럽게 녹여내되, 매 문장마다 언급하지 말 것
4. 팔로워가 저장하고 싶은 유용한 정보 또는 공감 콘텐츠여야 함

JSON 형식으로만 답변:
{ "title": "제목 (선택사항)", "caption": "본문", "hashtags": ["#해시태그", ...] }

반드시 유효한 JSON만 출력하세요.`;
}

// ─── 1. 템플릿 카드 생성 (Sharp + SVG) ─────────────────

export async function generateTemplateCard(
    product: SNSProduct,
    platform: SNSPlatform
): Promise<Buffer> {
    const spec = PLATFORM_SPECS[platform];
    const { width, height } = spec;

    // 상품 이미지 가져오기
    const firstImage = product.image_url.split(',')[0].trim();
    const imageResponse = await fetch(firstImage);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // 상품 이미지 메타데이터
    const imgMeta = await sharp(imageBuffer).metadata();
    const imgW = imgMeta.width || 800;
    const imgH = imgMeta.height || 800;

    // 플랫폼별 레이아웃 계산
    const layout = calculateLayout(width, height, imgW, imgH);

    // 상품 이미지 리사이즈
    const resizedImage = await sharp(imageBuffer)
        .resize(layout.imgW, layout.imgH, { fit: 'cover' })
        .toBuffer();

    // SVG 텍스트 오버레이 생성
    const svgOverlay = buildTemplateSVG(product, width, height);

    // Sharp 합성
    const result = await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 248, g: 247, b: 242, alpha: 255 }, // #F8F7F2
        },
    })
        .composite([
            { input: resizedImage, top: layout.imgTop, left: layout.imgLeft },
            { input: Buffer.from(svgOverlay), top: 0, left: 0 },
        ])
        .jpeg({ quality: 95 })
        .toBuffer();

    return result;
}

function calculateLayout(w: number, h: number, imgW: number, imgH: number) {
    // 상단 56px 브랜드바 + 하단 140px 정보바 → 나머지 영역에 상품 이미지
    const topBar = 56;
    const bottomBar = 140;
    const padding = 40;
    const availW = w - padding * 2;
    const availH = h - topBar - bottomBar - padding * 2;

    // 이미지를 available 영역에 맞추기 (contain)
    const scale = Math.min(availW / imgW, availH / imgH);
    const fitW = Math.round(imgW * scale);
    const fitH = Math.round(imgH * scale);

    return {
        imgW: fitW,
        imgH: fitH,
        imgTop: topBar + padding + Math.round((availH - fitH) / 2),
        imgLeft: padding + Math.round((availW - fitW) / 2),
    };
}

function buildTemplateSVG(product: SNSProduct, width: number, height: number): string {
    const priceFormatted = (product.price_sell || 0).toLocaleString();
    const brand = escapeXml(product.brand || 'VINTAGE');
    const condition = escapeXml(product.condition || 'A급');

    // 등급별 배지 색상
    const conditionColor = condition.includes('S') ? '#D4AF37'
        : condition.includes('B') ? '#8B6914' : '#1A4D3E';

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- 상단 브랜드 바 -->
  <rect x="0" y="0" width="${width}" height="56" fill="#1A4D3E"/>
  <text x="${width / 2}" y="36" text-anchor="middle"
        font-family="Georgia,serif" font-size="20" font-weight="700"
        fill="#F8F7F2" letter-spacing="5">BROWNSTREET</text>

  <!-- 하단 정보 바 -->
  <rect x="0" y="${height - 140}" width="${width}" height="140" fill="#1A4D3E" opacity="0.93"/>

  <!-- 브랜드명 -->
  <text x="36" y="${height - 100}"
        font-family="sans-serif" font-size="20" font-weight="700" fill="#D4C9A8"
        letter-spacing="1.5">${brand}</text>

  <!-- 가격 -->
  <text x="36" y="${height - 58}"
        font-family="sans-serif" font-size="36" font-weight="900" fill="#FFFFFF">&#8361;${priceFormatted}</text>

  <!-- 등급 배지 -->
  <rect x="${width - 130}" y="${height - 118}" width="94" height="36" rx="18" fill="${conditionColor}"/>
  <text x="${width - 83}" y="${height - 94}" text-anchor="middle"
        font-family="sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">${condition}</text>

  <!-- 하단 URL -->
  <text x="36" y="${height - 20}"
        font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.5)">factory.brownstreet.co.kr</text>
</svg>`;
}

function escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ─── 2. AI 에디토리얼 이미지 생성 (Gemini) ──────────────

export async function generateEditorialImage(
    product: SNSProduct,
    platform: SNSPlatform
): Promise<{ imageBase64: string; mimeType: string } | null> {
    const spec = PLATFORM_SPECS[platform];
    const MOOD_MODEL = 'gemini-2.5-flash-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MOOD_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = buildEditorialPrompt(product, platform);
    const parts: any[] = [{ text: prompt }];

    // 상품 이미지 첨부 (스타일 참조용)
    if (product.image_url) {
        try {
            const firstImage = product.image_url.split(',')[0].trim();
            const imageBase64 = await fetchImageAsBase64(firstImage);
            parts.push({
                inline_data: { mime_type: 'image/jpeg', data: imageBase64 }
            });
            parts.push({ text: 'Above is the product photo. Feature this garment prominently in the marketing image. Match its color palette and style.' });
        } catch (e) {
            console.warn('[SNS Editorial] 상품 이미지 로드 실패, 텍스트만으로 생성');
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
                    imageConfig: { aspectRatio: spec.aspectRatio || '1:1' },
                },
            }),
        });
        data = await response.json();
        if (response.ok) break;

        const errMsg = data.error?.message || '';
        console.warn(`[SNS Editorial] attempt ${attempt + 1}/${MAX_RETRIES} failed: ${response.status} ${errMsg}`);
        const isRetryable = errMsg.includes('high demand') || errMsg.includes('overloaded') || response.status === 429 || response.status === 503;
        if (isRetryable) {
            await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
            continue;
        }
        break;
    }

    if (!response!.ok) {
        console.error('[SNS Editorial] Gemini 최종 오류:', data?.error?.message || JSON.stringify(data).slice(0, 500));
        return null;
    }

    const candidate = data.candidates?.[0]?.content?.parts;
    if (!candidate) return null;

    for (const part of candidate) {
        if (part.inlineData) {
            return {
                imageBase64: part.inlineData.data,
                mimeType: part.inlineData.mimeType || 'image/png',
            };
        }
    }

    return null;
}

function buildEditorialPrompt(product: SNSProduct, platform: SNSPlatform): string {
    const brandText = product.brand || 'Vintage';
    const nameText = product.name || 'Fashion item';
    const categoryText = product.category_name || product.category || 'Apparel';
    const priceText = product.price_sell ? `${product.price_sell.toLocaleString()}원` : '';

    const platformGuide: Record<string, string> = {
        'instagram-feed': `Square 1:1 composition optimized for Instagram grid. Clean, minimal, editorial flat-lay or hanger shot on textured background.`,
        'instagram-story': `Vertical 9:16 full-screen composition. Product centered in upper 60%. Lower area clean for potential text overlay. Dramatic lighting, intimate close-up feel.`,
        'facebook': `Wide landscape composition (1200x630). Product on left 60%, atmospheric lifestyle on right 40%. Bold and eye-catching for link preview cards.`,
        'kakao': `Wide banner style (2:1). Product centered with generous negative space. Clean and modern, suitable for messaging platform thumbnail.`,
    };

    return `You are a top-tier fashion brand social media creative director for "Brownstreet" - a premium Korean vintage clothing store.

Create a high-end marketing image for this product:
- Brand: ${brandText}
- Product: ${nameText}
- Category: ${categoryText}
${priceText ? `- Price: ${priceText}` : ''}
- Condition: ${product.condition || 'A급'}

PLATFORM-SPECIFIC:
${platformGuide[platform] || platformGuide['instagram-feed']}

RULES:
1. Feature the ACTUAL product image prominently - this is a product marketing shot, not just a mood image
2. Background: Warm beige linen, aged wood, concrete texture, or clean studio setting
3. Subtle lifestyle props: leather journal, coffee cup, botanical elements, vintage camera
4. Lighting: Natural, soft shadows, slightly warm tone
5. Aesthetic: Korean vintage archive meets modern editorial (think Grailed, The RealReal editorial)
6. ABSOLUTELY NO TEXT, LOGOS, WATERMARKS, OR LETTERS in the image
7. Must look like a professional product shoot, not AI-generated
8. Color palette should complement the product's actual colors`;
}

// ─── 3. 캡션 + 해시태그 생성 (Gemini 텍스트) ────────────

export async function generateCaption(
    product: SNSProduct,
    platform: SNSPlatform
): Promise<{ caption: string; hashtags: string[]; title?: string }> {
    const prompt = buildCaptionPrompt(product, platform);

    const response = await fetch(`${GEMINI_MD_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 },
        }),
    });

    if (!response.ok) {
        // 폴백: 기본 캡션
        return buildFallbackCaption(product, platform);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return buildFallbackCaption(product, platform);

    try {
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(jsonStr);
        return {
            caption: result.caption || '',
            hashtags: result.hashtags || [],
            title: result.title,
        };
    } catch {
        // JSON 파싱 실패 → 전체 텍스트를 캡션으로
        return { caption: text, hashtags: extractHashtags(text) };
    }
}

function buildCaptionPrompt(product: SNSProduct, platform: SNSPlatform): string {
    const info = `상품 정보:
- 브랜드: ${product.brand || '브랜드 미상'}
- 상품명: ${product.name}
- 카테고리: ${product.category_name || product.category || '의류'}
- 판매가: ${product.price_sell ? `${product.price_sell.toLocaleString()}원` : '가격 미정'}
${product.price_consumer ? `- 소비자가: ${product.price_consumer.toLocaleString()}원` : ''}
- 등급: ${product.condition || 'A급'}
${product.size ? `- 사이즈: ${product.size}` : ''}
${product.fabric ? `- 소재: ${product.fabric}` : ''}`;

    const platformPrompts: Record<SNSPlatform, string> = {
        'instagram-feed': `당신은 한국 프리미엄 빈티지 의류 매장 "브라운스트리트"의 인스타그램 담당자입니다.

${info}

인스타그램 피드 캡션을 작성하세요:
1. 첫 줄: 감성적인 훅 문장 (이모지 1개)
2. 2~3줄: 상품의 핵심 매력 (소재감, 핏, 브랜드 가치, 희소성)
3. 가격 표기: ₩${(product.price_sell || 0).toLocaleString()}
4. CTA: "스마트스토어에서 만나보세요" 또는 "DM으로 문의"
5. 총 5줄 이내
6. 해시태그 15개 (한국어+영어 혼합, 빈티지/중고/브랜드/카테고리 키워드)

JSON: { "caption": "...", "hashtags": ["#빈티지", "#vintage", ...] }`,

        'instagram-story': `당신은 한국 프리미엄 빈티지 의류 매장 "브라운스트리트"의 인스타그램 담당자입니다.

${info}

인스타그램 스토리 텍스트를 작성하세요:
1. 짧고 임팩트 있는 1~2줄 (10단어 이내)
2. 긴급성/한정성 강조 ("단 1점", "NOW AVAILABLE")
3. 가격 + 등급
4. 해시태그 5개

JSON: { "caption": "...", "hashtags": ["#빈티지", ...] }`,

        'facebook': `당신은 한국 프리미엄 빈티지 의류 매장 "브라운스트리트"의 페이스북 담당자입니다.

${info}

페이스북 포스트를 작성하세요:
1. 첫 줄: 눈길을 끄는 제목
2. 본문: 3~4줄, 상품 상세 설명 (브랜드 역사, 상태, 스타일링 팁)
3. 가격 + 구매 링크 안내
4. 해시태그 10개

JSON: { "caption": "...", "hashtags": ["#빈티지", ...] }`,

        'naver-blog': `당신은 한국 프리미엄 빈티지 의류 매장 "브라운스트리트"의 블로그 담당자입니다.

${info}

네이버 블로그 포스트 제목 + 요약을 작성하세요:
1. title: SEO 최적화된 블로그 제목 (40자 이내)
2. caption: 블로그 도입부 3~4줄 (브랜드 소개, 상품 매력, 구매 유도)
3. 해시태그 10개

JSON: { "title": "...", "caption": "...", "hashtags": ["#빈티지", ...] }`,

        'daangn': `당신은 당근마켓에서 빈티지 의류를 판매하는 "브라운스트리트" 업체입니다.

${info}

당근마켓 업체홍보 게시글을 작성하세요:
1. title: [브랜드] 핵심특징 사이즈 (30자 이내)
2. caption: 상태 + 사이즈 + 소재 + 구매 포인트 (친근하고 솔직한 톤, 200자 이내)
3. 마지막에 "택배 가능 / 직거래 가능 (성수동)" 포함
4. 해시태그 없음

JSON: { "title": "...", "caption": "...", "hashtags": [] }`,

        'bungae': `당신은 번개장터에서 빈티지 의류를 판매하는 "브라운스트리트" 업체입니다.

${info}

번개장터 상품 설명을 작성하세요:
1. title: 브랜드 + 핵심특징 + 사이즈 (35자 이내)
2. caption: 상세한 컨디션 설명 + 사이즈 정보 + 소재 + "정품 100% 보장" (250자 이내)
3. 해시태그 5개 (번개장터 검색 키워드)

JSON: { "title": "...", "caption": "...", "hashtags": ["#빈티지", ...] }`,

        'kakao': `당신은 카카오톡 채널 "브라운스트리트"의 마케팅 담당자입니다.

${info}

카카오톡 채널 메시지를 작성하세요:
1. title: 짧고 임팩트 있는 한 줄 (20자 이내)
2. caption: 2줄 설명 + 가격 + "스마트스토어에서 확인하세요!" (80자 이내)
3. 해시태그 없음

JSON: { "title": "...", "caption": "...", "hashtags": [] }`,
    };

    return platformPrompts[platform] + '\n\n반드시 유효한 JSON만 출력하세요. 다른 텍스트는 출력하지 마세요.';
}

function buildFallbackCaption(product: SNSProduct, platform: SNSPlatform): { caption: string; hashtags: string[]; title?: string } {
    const price = product.price_sell ? `₩${product.price_sell.toLocaleString()}` : '';
    const brand = product.brand || '빈티지';
    return {
        caption: `${brand}의 ${product.condition || 'A급'} ${product.category_name || product.category || '아이템'}. ${price} 스마트스토어에서 만나보세요!`,
        hashtags: ['#빈티지', '#중고의류', '#브라운스트리트', `#${brand}`, '#빈티지패션'],
        title: platform === 'daangn' || platform === 'bungae' ? `[${brand}] ${product.name}` : undefined,
    };
}

function extractHashtags(text: string): string[] {
    const matches = text.match(/#[가-힣A-Za-z0-9_]+/g);
    return matches ? [...new Set(matches)].slice(0, 15) : [];
}

// ─── 4. 네이버 블로그 HTML 생성 ──────────────────────────

export function generateBlogHTML(product: SNSProduct): string {
    // product-detail-generator의 generateProductDetailHTML을 런타임에 import
    // (순환 의존성 방지)
    const { generateProductDetailHTML } = require('./product-detail-generator');
    const detailHTML = generateProductDetailHTML(product);

    return `<div style="max-width:860px; margin:0 auto; font-family:'나눔스퀘어','NanumSquare','Malgun Gothic',sans-serif;">
  <div style="text-align:center; margin:30px 0 40px;">
    <p style="font-size:12px; color:#8B7E6A; letter-spacing:4px; margin:0 0 8px;">BROWNSTREET ARCHIVE</p>
    <h2 style="font-size:22px; font-weight:900; color:#1A4D3E; margin:0;">${escapeXml(product.brand || 'VINTAGE')} ${escapeXml(product.category_name || product.category || '')}</h2>
    <div style="width:40px; height:2px; background:#1A4D3E; margin:16px auto 0;"></div>
  </div>
  ${detailHTML}
  <div style="text-align:center; margin:40px 0; padding:24px; background:#F8F7F2; border-radius:12px; border:1px solid #EAE8DF;">
    <p style="font-size:15px; font-weight:900; color:#1A4D3E; margin:0 0 8px;">BROWNSTREET</p>
    <p style="font-size:13px; color:#555; margin:0 0 4px;">프리미엄 빈티지 &amp; 아카이브 셀렉트숍</p>
    <p style="font-size:12px; color:#888; margin:0;">factory.brownstreet.co.kr</p>
  </div>
</div>`;
}
