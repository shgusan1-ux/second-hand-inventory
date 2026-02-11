import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const suggestions = [
    { id: '13013469519', cat: 'MILITARY', reason: '밀리터리 무드의 야상 점퍼' },
    { id: '13012191859', cat: 'MILITARY', reason: '빈티지 아카이브 밀리터리 패치워크 디자인' },
    { id: '13010643746', cat: 'MILITARY', reason: '유틸리티 사파리 야상 스타일' },
    { id: '13037118928', cat: 'WORKWEAR', reason: '데님 워싱 디자인 및 팬츠' },
    { id: '13010729823', cat: 'WORKWEAR', reason: '카고 포켓 유틸리티 워크 팬츠' },
    { id: '13013212106', cat: 'WORKWEAR', reason: '유틸리티 카고 데님 스타일' },
    { id: '13037116476', cat: 'JAPAN', reason: '일본 대표 셀렉숍 브랜드 URBAN RESEARCH' },
    { id: '13013507001', cat: 'JAPAN', reason: '일본발(JPN) 아카이브 미니멀 코트' },
    { id: '13013505410', cat: 'JAPAN', reason: '일본 패션 브랜드 LOWRYS FARM' },
    { id: '13013503866', cat: 'JAPAN', reason: '일본 브랜드 AZUL BY MOUSSY' },
    { id: '13013490641', cat: 'JAPAN', reason: '일본 로맨틱 빈티지 브랜드 AXES FEMME' },
    { id: '13013369733', cat: 'JAPAN', reason: '일본 브랜드 AS KNOW AS PINKY' },
    { id: '13013159461', cat: 'JAPAN', reason: '일본 브랜드 AXES FEMME 롱 스커트' },
    { id: '13011753980', cat: 'JAPAN', reason: '일본 라이프스타일 브랜드 niko and...' },
    { id: '13010762330', cat: 'JAPAN', reason: '일본 브랜드 LOWRYS FARM 니트 원피스' },
    { id: '13010760624', cat: 'JAPAN', reason: '일본 브랜드 Earth Music & Ecology' },
    { id: '13010713239', cat: 'JAPAN', reason: '일본(JPN) 아카이브 울 코트' },
    { id: '13006756204', cat: 'JAPAN', reason: '일본 프리미엄 키즈 브랜드 MIKI HOUSE' },
    { id: '13013660811', cat: 'EUROPE', reason: '프랑스 럭셔리 하우스 YVES SAINT LAURENT' },
    { id: '13013648398', cat: 'EUROPE', reason: '프랑스 오뜨 꾸뛰르 브랜드 LANVIN' },
    { id: '13011639439', cat: 'EUROPE', reason: '프랑스 럭셔리 하우스 YVES SAINT LAURENT' },
    { id: '13011612450', cat: 'EUROPE', reason: '이탈리아 하이엔드 테일러링 ERMENEGILDO ZEGNA' },
    { id: '13011585644', cat: 'EUROPE', reason: '브랜드(Karl Lagerfeld) 베이스 및 헤리티지 기준' },
    { id: '13011767253', cat: 'EUROPE', reason: '프랑스 컨템포러리 브랜드 CACHAREL' },
    { id: '13006755213', cat: 'BRITISH', reason: '클래식 발마칸 코트 브랜드 헤리티지' },
    { id: '13013501160', cat: 'JAPAN', reason: '일본 브랜드 HONEYSUCKLE ROSE 롱 스커트' },
    { id: '13013453652', cat: 'JAPAN', reason: '일본계 Y2K 아카이브 부츠컷 팬츠 (VIENUS)' },
    { id: '13013425657', cat: 'JAPAN', reason: '일본 트렌드 브랜드 SUREVE 크롭 가디건' },
    { id: '13013206232', cat: 'JAPAN', reason: '재팬(JPN) 고밀도 코듀로이 카고 팬츠' },
    { id: '13013195774', cat: 'JAPAN', reason: '일본 프리미엄 데님 브랜드 MOUSSY' },
    { id: '13012212794', cat: 'JAPAN', reason: '일본 라이프스타일 브랜드 SEVENDAYS SUNDAY' },
    { id: '13012145726', cat: 'JAPAN', reason: '일본 빈티지 브랜드 IN THE ATTIC' },
    { id: '13012116231', cat: 'JAPAN', reason: '일본 에스닉 빈티지 브랜드 MALAIKA' },
    { id: '13010763602', cat: 'JAPAN', reason: '일본 여성 패션 브랜드 NICE CLAUP' },
    { id: '13010682677', cat: 'JAPAN', reason: '일본 소재 중심 데님 브랜드 BRAPPERS' },
    { id: '13010648365', cat: 'JAPAN', reason: '일본발 아카이브 아웃도어 브랜드 GRAMICCI' },
    { id: '13010641689', cat: 'JAPAN', reason: '일본 아웃도어 브랜드 MONT-BELL' },
    { id: '13000427044', cat: 'JAPAN', reason: '일본 브랜드 UNIQLO 아카이브 유틸리티' },
    { id: '13013156021', cat: 'WORKWEAR', reason: '리바이스(LEVIS) 프리미엄 스트레이트 데님' }
];

async function applySuggestions() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log(`Applying ${suggestions.length} AI suggestions...`);
        for (const s of suggestions) {
            await client.execute({
                sql: `UPDATE naver_product_map 
                      SET suggested_archive_id = ?, suggestion_reason = ? 
                      WHERE origin_product_no = ?`,
                args: [s.cat, s.reason, s.id]
            });
        }
        console.log('✅ Suggestions saved to DB (Pending Approval)');
    } catch (e) {
        console.error(e);
    } finally {
        client.close();
    }
}

applySuggestions();
