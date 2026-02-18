
import { db } from './db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
구글 검색(Google Search) 기능을 활성화하여 현재 실시간으로 유행하거나 아카이브 가치가 급상승 중인 고가치 패션 브랜드 20~30개를 발굴하세요.

분석 및 검색 대상 (Real-time Market Research):
1. 일본 시장: Mercari JP, Yahoo Auctions JP, 2nd STREET 등에서 최근 'Archive' 또는 'Vintage' 키워드로 가장 많이 거래되는 브랜드 (예: 90s Undercover, Number (N)ine, Hysteric Glamour의 특정 시즌 등)
2. 글로벌 아카이브: Grailed, Vestiaire Collective에서 'Trending' 섹션에 있는 디자이너 브랜드
3. 테크니컬/고프코어: 90s-00s Oakley, Arc'teryx (Vintage), Salomon (Advanced/Collaborations) 외에 새롭게 주목받는 테크니컬 브랜드
4. 브리티쉬/유러피안: Stone Island (CP Company), Barbour (Special colab), Maison Margiela (Artisanal era) 등을 잇는 다음 세대 브랜드

요구사항:
1. 검색 도구를 사용하여 2024-2025년 현재 가장 핫한 아카이브 브랜드를 찾으세요.
2. 너무 대중적인 브랜드(ZARA, H&M 등)는 제외하고, 매니아층이 확고한 브랜드를 포함하세요.
3. 다음 브랜드들은 이미 저장되어 있으니 제외하세요: ${existingNames.slice(0, 150).join(', ')}
4. 결과는 반드시 다음 JSON 배열 형식으로만 응답하세요:
[
  { "brand_name": "영문명", "brand_name_ko": "한글명", "tier": "카테고리", "country": "국가", "aliases": ["별칭1", "별칭2"] }
]

카테고리(tier): HERITAGE EUROPE, BRITISH ARCHIVE, JAPANESE ARCHIVE, WORKWEAR ARCHIVE, OUTDOOR ARCHIVE, UNISEX ARCHIVE
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                tools: [{ google_search_retrieval: {} }]
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
