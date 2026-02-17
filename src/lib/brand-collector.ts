
import { db } from './db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function collectDailyBrands() {
    console.log('🤖 AI 브랜드 수집 시작...');

    if (!GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY가 설정되지 않았습니다.');
        return { success: false, error: 'API Key missing' };
    }

    try {
        // 1. 현재 저장된 브랜드 목록 가져오기 (중복 방지 및 필터링용)
        const { rows: existingBrands } = await db.query('SELECT brand_name FROM custom_brands');
        const existingNames = existingBrands.map((b: any) => b.brand_name.toUpperCase());

        // 2. Gemini에게 유행하는/아카이브 가치 있는 브랜드 추천 요청
        const prompt = `
당신은 전세계 하이엔드 패션 및 빈티지 아카이브 전문가입니다.
중고 의류 재고 관리 시스템을 위해 가치 있는 패션 브랜드 리스트를 추천해주세요.

분석 기준 (Regional Expertise):
1. 일본 브랜드: Mercari JP, Yahoo Auctions JP, 2nd STREET, ZOZOTOWN 등 일본 현지 마켓에서 거래되는 'Ura-Harajuku' 및 'Designer Archive' 브랜드를 집중 분석하세요.
2. 영국 브랜드: Depop, END. Clothing, eBay UK, Selfridges 등에서 선호되는 브리티쉬 헤리티지 및 테크니컬 아카이브 브랜드를 찾으세요.
3. 유럽/글로벌: Vestiaire Collective, Grailed, Farfetch 등 프리미엄 플랫폼에서 'Archive'로 분류되는 고가치 브랜드를 발굴하세요.

요구사항:
1. 일본 아카이브, 브리티쉬 헤리티지, 유럽 명품/디자이너, 미국 워크웨어, 국내 신진 디자이너 브랜드를 골고루 수집하세요.
2. 너무 대중적인 브랜드보다는 매니아층이 확고하고 아카이브 수집 가치가 있는 니치(Niche) 브랜드를 포함하세요.
3. 다음 브랜드들은 이미 존재하므로 제외하세요: ${existingNames.slice(0, 150).join(', ')}
4. 결과는 반드시 다음과 같은 JSON 배열 형식으로만 응답하세요.

형식:
[
  { "brand_name": "영문명", "brand_name_ko": "한글명", "tier": "카테고리", "country": "국가", "aliases": ["별칭1", "별칭2"] }
]

카테고리(tier) 후보:
- HERITAGE EUROPE (유럽 명품/전통)
- BRITISH ARCHIVE (영국 아카이브)
- JAPANESE ARCHIVE (일본 아카이브)
- WORKWEAR ARCHIVE (워크웨어/군복)
- OUTDOOR ARCHIVE (아웃도어)
- UNISEX ARCHIVE (유니섹스/디자이너)

약 20~30개 정도의 새로운 브랜드를 추천해주세요.
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('AI 응답이 비어있습니다.');

        // JSON 추출
        const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        const newBrands = JSON.parse(jsonStr);

        if (!Array.isArray(newBrands)) throw new Error('올바른 배열 형식이 아닙니다.');

        console.log(`🔎 AI가 ${newBrands.length}개의 새로운 브랜드를 추천했습니다.`);

        // 3. DB 저장
        let savedCount = 0;
        for (const brand of newBrands) {
            try {
                const aliasesJson = JSON.stringify(brand.aliases || []);
                await db.query(
                    `INSERT INTO custom_brands (brand_name, brand_name_ko, aliases, tier, country, is_active)
                     VALUES ($1, $2, $3, $4, $5, TRUE)
                     ON CONFLICT(brand_name) DO NOTHING`,
                    [brand.brand_name.toUpperCase(), brand.brand_name_ko, aliasesJson, brand.tier, brand.country]
                );
                savedCount++;
            } catch (e) {
                console.error(`브랜드 저장 실패 (${brand.brand_name}):`, e);
            }
        }

        return { success: true, count: savedCount, brands: newBrands.map(b => b.brand_name) };
    } catch (error: any) {
        console.error('브랜드 수집 중 오류:', error);
        return { success: false, error: error.message };
    }
}
