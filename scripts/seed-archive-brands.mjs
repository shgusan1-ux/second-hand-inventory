
const BRANDS = [
    // European Luxury & Vintage
    { brand_name: 'CHANEL', brand_name_ko: '샤넬', tier: 'LUXURY', country: 'France' },
    { brand_name: 'HERMES', brand_name_ko: '에르메스', tier: 'LUXURY', country: 'France' },
    { brand_name: 'DIOR', brand_name_ko: '디올', tier: 'LUXURY', country: 'France' },
    { brand_name: 'YVES SAINT LAURENT', brand_name_ko: '입생로랑', tier: 'LUXURY', country: 'France', aliases: ['YSL'] },
    { brand_name: 'GUCCI', brand_name_ko: '구찌', tier: 'LUXURY', country: 'Italy' },
    { brand_name: 'VERSACE', brand_name_ko: '베르사체', tier: 'LUXURY', country: 'Italy' },
    { brand_name: 'PRADA', brand_name_ko: '프라다', tier: 'LUXURY', country: 'Italy' },
    { brand_name: 'BURBERRY', brand_name_ko: '버버리', tier: 'LUXURY', country: 'UK' },
    { brand_name: 'CELINE', brand_name_ko: '셀린느', tier: 'LUXURY', country: 'France' },
    { brand_name: 'FENDI', brand_name_ko: '펜디', tier: 'LUXURY', country: 'Italy' },
    { brand_name: 'BALENCIAGA', brand_name_ko: '발렌시아가', tier: 'LUXURY', country: 'France' },
    { brand_name: 'GIVENCHY', brand_name_ko: '지방시', tier: 'LUXURY', country: 'France' },
    { brand_name: 'LOUIS VUITTON', brand_name_ko: '루이비통', tier: 'LUXURY', country: 'France', aliases: ['LV'] },

    // Archive & Avant-Garde
    { brand_name: 'RAF SIMONS', brand_name_ko: '라프 시몬스', tier: 'ARCHIVE', country: 'Belgium' },
    { brand_name: 'HELMUT LANG', brand_name_ko: '헬무트 랭', tier: 'ARCHIVE', country: 'Austria' },
    { brand_name: 'MAISON MARTIN MARGIELA', brand_name_ko: '메종 마르지엘라', tier: 'ARCHIVE', country: 'France', aliases: ['MARGIELA', 'MMM'] },
    { brand_name: 'COMME DES GARCONS', brand_name_ko: '꼼데가르송', tier: 'ARCHIVE', country: 'Japan', aliases: ['CDG'] },
    { brand_name: 'YOHJI YAMAMOTO', brand_name_ko: '요지 야마모토', tier: 'ARCHIVE', country: 'Japan' },
    { brand_name: 'ISSEY MIYAKE', brand_name_ko: '이세이 미야케', tier: 'ARCHIVE', country: 'Japan' },
    { brand_name: 'VIVIENNE WESTWOOD', brand_name_ko: '비비안 웨스트우드', tier: 'ARCHIVE', country: 'UK' },
    { brand_name: 'RICK OWENS', brand_name_ko: '릭 오웬스', tier: 'ARCHIVE', country: 'USA' },
    { brand_name: 'STONE ISLAND', brand_name_ko: '스톤 아일랜드', tier: 'ARCHIVE', country: 'Italy' },
    { brand_name: 'UNDERCOVER', brand_name_ko: '언더커버', tier: 'ARCHIVE', country: 'Japan' },
    { brand_name: 'JEAN PAUL GAULTIER', brand_name_ko: '장 폴 고티에', tier: 'ARCHIVE', country: 'France', aliases: ['JPG'] },
    { brand_name: 'ALEXANDER MCQUEEN', brand_name_ko: '알렉산더 맥퀸', tier: 'ARCHIVE', country: 'UK' },

    // American Heritage & Vintage
    { brand_name: 'RALPH LAUREN', brand_name_ko: '랄프로렌', tier: 'HERITAGE', country: 'USA', aliases: ['POLO'] },
    { brand_name: 'LEVIS', brand_name_ko: '리바이스', tier: 'HERITAGE', country: 'USA' },
    { brand_name: 'PATAGONIA', brand_name_ko: '파타고니아', tier: 'HERITAGE', country: 'USA' },
    { brand_name: 'THE NORTH FACE', brand_name_ko: '노스페이스', tier: 'HERITAGE', country: 'USA', aliases: ['TNF'] },
    { brand_name: 'CARHARTT', brand_name_ko: '칼하트', tier: 'HERITAGE', country: 'USA' },
    { brand_name: 'CHAMPION', brand_name_ko: '챔피온', tier: 'HERITAGE', country: 'USA' },

    // Japanese Street & Archive
    { brand_name: 'A BATHING APE', brand_name_ko: '베이프', tier: 'STREET', country: 'Japan', aliases: ['BAPE'] },
    { brand_name: 'NEIGHBORHOOD', brand_name_ko: '네이버후드', tier: 'STREET', country: 'Japan' },
    { brand_name: 'WTAPS', brand_name_ko: '더블탭스', tier: 'STREET', country: 'Japan' },
    { brand_name: 'VISVIM', brand_name_ko: '비즈빔', tier: 'STREET', country: 'Japan' },
    { brand_name: 'NEEDLES', brand_name_ko: '니들스', tier: 'STREET', country: 'Japan' },

    // Korean Archive & Designer
    { brand_name: 'POST ARCHIVE FACTION', brand_name_ko: '포스트 아카이브 팩션', tier: 'ARCHIVE', country: 'Korea', aliases: ['PAF'] },
    { brand_name: 'POLYTERU', brand_name_ko: '폴리테루', tier: 'DESIGNER', country: 'Korea' },
    { brand_name: 'KANGHYUK', brand_name_ko: '강혁', tier: 'ARCHIVE', country: 'Korea' },
    { brand_name: 'MINJU KIM', brand_name_ko: '민주킴', tier: 'DESIGNER', country: 'Korea' },
    { brand_name: 'OURSELVES', brand_name_ko: '아워셀브스', tier: 'DESIGNER', country: 'Korea' },
    { brand_name: 'SLY', brand_name_ko: '슬라이', tier: 'STREET', country: 'Japan' },
    { brand_name: 'MOUSSY', brand_name_ko: '마우지', tier: 'STREET', country: 'Japan' },
    { brand_name: 'HYSTERIC GLAMOUR', brand_name_ko: '히스테릭 글래머', tier: 'ARCHIVE', country: 'Japan' },
];

async function seed() {
    console.log('🚀 Seeding brands to Archive Master...');

    const response = await fetch('http://localhost:3000/api/smartstore/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(BRANDS)
    });

    const result = await response.json();
    console.log('✅ Result:', result);
}

seed().catch(console.error);
