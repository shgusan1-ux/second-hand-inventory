// 브랜드 티어 데이터베이스 (150+ 브랜드)
import type { BrandInfo, BrandTier } from './types';

const DB: Record<string, BrandInfo> = {
  // ===== HERITAGE / JAPAN / BRITISH ARCHIVE =====
  'DOLCE&GABBANA': { canonical: 'Dolce & Gabbana', aliases: ['D&G', '돌체앤가바나', '돌체'], tier: 'HERITAGE', origin: 'Italy' },
  'GUCCI': { canonical: 'Gucci', aliases: ['구찌'], tier: 'HERITAGE', origin: 'Italy' },
  'PRADA': { canonical: 'Prada', aliases: ['프라다'], tier: 'HERITAGE', origin: 'Italy' },
  'BURBERRY': { canonical: 'Burberry', aliases: ['버버리', 'BURBERRYS'], tier: 'BRITISH', origin: 'UK' },
  'YVES SAINT LAURENT': { canonical: 'Saint Laurent', aliases: ['YSL', '생로랑', '입생로랑', 'SAINT LAURENT'], tier: 'HERITAGE', origin: 'France' },
  'LANVIN': { canonical: 'Lanvin', aliases: ['랑방'], tier: 'HERITAGE', origin: 'France' },
  'GIVENCHY': { canonical: 'Givenchy', aliases: ['지방시'], tier: 'HERITAGE', origin: 'France' },
  'VALENTINO': { canonical: 'Valentino', aliases: ['발렌티노'], tier: 'HERITAGE', origin: 'Italy' },
  'FENDI': { canonical: 'Fendi', aliases: ['펜디'], tier: 'HERITAGE', origin: 'Italy' },
  'BOTTEGA VENETA': { canonical: 'Bottega Veneta', aliases: ['보테가베네타', 'BV', '보테가'], tier: 'HERITAGE', origin: 'Italy' },
  'HERMES': { canonical: 'Hermes', aliases: ['에르메스'], tier: 'HERITAGE', origin: 'France' },
  'CELINE': { canonical: 'Celine', aliases: ['셀린느', '셀린'], tier: 'HERITAGE', origin: 'France' },
  'LOEWE': { canonical: 'Loewe', aliases: ['로에베'], tier: 'HERITAGE', origin: 'Spain' },
  'BALENCIAGA': { canonical: 'Balenciaga', aliases: ['발렌시아가'], tier: 'HERITAGE', origin: 'France' },
  'VERSACE': { canonical: 'Versace', aliases: ['베르사체'], tier: 'HERITAGE', origin: 'Italy' },
  'DIOR': { canonical: 'Dior', aliases: ['디올', 'CHRISTIAN DIOR'], tier: 'HERITAGE', origin: 'France' },
  'SALVATORE FERRAGAMO': { canonical: 'Ferragamo', aliases: ['페라가모', 'FERRAGAMO'], tier: 'HERITAGE', origin: 'Italy' },
  'MONCLER': { canonical: 'Moncler', aliases: ['몽클레르'], tier: 'HERITAGE', origin: 'France' },
  'LOUIS VUITTON': { canonical: 'Louis Vuitton', aliases: ['루이비통', 'LV'], tier: 'HERITAGE', origin: 'France' },
  'CHANEL': { canonical: 'Chanel', aliases: ['샤넬'], tier: 'HERITAGE', origin: 'France' },
  'GIORGIO ARMANI': { canonical: 'Giorgio Armani', aliases: ['조르지오아르마니'], tier: 'HERITAGE', origin: 'Italy' },
  'TOM FORD': { canonical: 'Tom Ford', aliases: ['톰포드'], tier: 'HERITAGE', origin: 'USA' },
  'ALEXANDER MCQUEEN': { canonical: 'Alexander McQueen', aliases: ['알렉산더맥퀸'], tier: 'HERITAGE', origin: 'UK' },
  'ERMENEGILDO ZEGNA': { canonical: 'Zegna', aliases: ['제냐', 'ZEGNA'], tier: 'HERITAGE', origin: 'Italy' },
  'BRUNELLO CUCINELLI': { canonical: 'Brunello Cucinelli', aliases: ['브루넬로쿠치넬리'], tier: 'HERITAGE', origin: 'Italy' },

  // ===== PREMIUM =====
  'POLO RALPH LAUREN': { canonical: 'Polo Ralph Lauren', aliases: ['폴로 랄프로렌', '폴로', '랄프로렌', 'RALPH LAUREN', 'RRL'], tier: 'HERITAGE', origin: 'USA' },
  'TOMMY HILFIGER': { canonical: 'Tommy Hilfiger', aliases: ['타미힐피거', '타미'], tier: 'HERITAGE', origin: 'USA' },
  'LACOSTE': { canonical: 'Lacoste', aliases: ['라코스테'], tier: 'HERITAGE', origin: 'France' },
  'FRED PERRY': { canonical: 'Fred Perry', aliases: ['프레드페리'], tier: 'BRITISH', origin: 'UK' },
  'BROOKS BROTHERS': { canonical: 'Brooks Brothers', aliases: ['브룩스브라더스'], tier: 'HERITAGE', origin: 'USA' },
  'HUGO BOSS': { canonical: 'Hugo Boss', aliases: ['휴고보스', 'BOSS'], tier: 'HERITAGE', origin: 'Germany' },
  'CALVIN KLEIN': { canonical: 'Calvin Klein', aliases: ['캘빈클라인', 'CK'], tier: 'HERITAGE', origin: 'USA' },
  'BARBOUR': { canonical: 'Barbour', aliases: ['바버'], tier: 'BRITISH', origin: 'UK' },
  'AQUASCUTUM': { canonical: 'Aquascutum', aliases: ['아쿠아스큐텀'], tier: 'BRITISH', origin: 'UK' },
  'PAUL SMITH': { canonical: 'Paul Smith', aliases: ['폴스미스'], tier: 'BRITISH', origin: 'UK' },
  'EMPORIO ARMANI': { canonical: 'Emporio Armani', aliases: ['엠포리오아르마니', 'EA7'], tier: 'HERITAGE', origin: 'Italy' },
  'MAX MARA': { canonical: 'Max Mara', aliases: ['막스마라'], tier: 'HERITAGE', origin: 'Italy' },
  'THEORY': { canonical: 'Theory', aliases: ['띠어리'], tier: 'HERITAGE', origin: 'USA' },
  'SANDRO': { canonical: 'Sandro', aliases: ['산드로'], tier: 'HERITAGE', origin: 'France' },
  'MAJE': { canonical: 'Maje', aliases: ['마쥬'], tier: 'HERITAGE', origin: 'France' },
  'TED BAKER': { canonical: 'Ted Baker', aliases: ['테드베이커'], tier: 'BRITISH', origin: 'UK' },
  'GANT': { canonical: 'Gant', aliases: ['간트'], tier: 'HERITAGE', origin: 'USA' },
  'J.CREW': { canonical: 'J.Crew', aliases: ['제이크루'], tier: 'HERITAGE', origin: 'USA' },
  'MARC JACOBS': { canonical: 'Marc Jacobs', aliases: ['마크제이콥스'], tier: 'HERITAGE', origin: 'USA' },
  'COACH': { canonical: 'Coach', aliases: ['코치'], tier: 'HERITAGE', origin: 'USA' },
  'MICHAEL KORS': { canonical: 'Michael Kors', aliases: ['마이클코어스', 'MK'], tier: 'HERITAGE', origin: 'USA' },
  'DIESEL': { canonical: 'Diesel', aliases: ['디젤'], tier: 'HERITAGE', origin: 'Italy' },
  'KENZO': { canonical: 'Kenzo', aliases: ['겐조'], tier: 'HERITAGE', origin: 'France' },
  'DUNHILL': { canonical: 'Dunhill', aliases: ['던힐'], tier: 'BRITISH', origin: 'UK' },
  'MACKINTOSH': { canonical: 'Mackintosh', aliases: ['매킨토시'], tier: 'BRITISH', origin: 'UK' },

  // ===== DESIGNER =====
  'COMME DES GARCONS': { canonical: 'Comme des Garcons', aliases: ['꼼데가르송', 'CDG', 'PLAY'], tier: 'JAPAN', origin: 'Japan' },
  'ISSEY MIYAKE': { canonical: 'Issey Miyake', aliases: ['이세이미야케', 'PLEATS PLEASE'], tier: 'JAPAN', origin: 'Japan' },
  'YOHJI YAMAMOTO': { canonical: 'Yohji Yamamoto', aliases: ['요지야마모토', "Y'S"], tier: 'JAPAN', origin: 'Japan' },
  'VIVIENNE WESTWOOD': { canonical: 'Vivienne Westwood', aliases: ['비비안웨스트우드'], tier: 'BRITISH', origin: 'UK' },
  'MAISON MARGIELA': { canonical: 'Maison Margiela', aliases: ['마르지엘라', 'MARTIN MARGIELA', 'MM6'], tier: 'HERITAGE', origin: 'France' },
  'UNDERCOVER': { canonical: 'Undercover', aliases: ['언더커버'], tier: 'JAPAN', origin: 'Japan' },
  'SACAI': { canonical: 'Sacai', aliases: ['사카이'], tier: 'JAPAN', origin: 'Japan' },
  'STONE ISLAND': { canonical: 'Stone Island', aliases: ['스톤아일랜드'], tier: 'HERITAGE', origin: 'Italy' },
  'A.P.C.': { canonical: 'A.P.C.', aliases: ['아페쎄', 'APC'], tier: 'HERITAGE', origin: 'France' },
  'ACNE STUDIOS': { canonical: 'Acne Studios', aliases: ['아크네', 'ACNE'], tier: 'HERITAGE', origin: 'Sweden' },
  'MARGARET HOWELL': { canonical: 'Margaret Howell', aliases: ['마가렛호웰', 'MHL'], tier: 'BRITISH', origin: 'UK' },
  'DRIES VAN NOTEN': { canonical: 'Dries Van Noten', aliases: ['드리스반노튼'], tier: 'HERITAGE', origin: 'Belgium' },
  'NEEDLES': { canonical: 'Needles', aliases: ['니들스'], tier: 'JAPAN', origin: 'Japan' },
  'VISVIM': { canonical: 'Visvim', aliases: ['비스빔'], tier: 'JAPAN', origin: 'Japan' },
  'KAPITAL': { canonical: 'Kapital', aliases: ['캐피탈'], tier: 'JAPAN', origin: 'Japan' },
  'NEIGHBORHOOD': { canonical: 'Neighborhood', aliases: ['네이버후드', 'NBHD'], tier: 'JAPAN', origin: 'Japan' },
  'WTAPS': { canonical: 'WTAPS', aliases: ['더블탭스'], tier: 'JAPAN', origin: 'Japan' },
  'ENGINEERED GARMENTS': { canonical: 'Engineered Garments', aliases: ['엔지니어드가먼츠', 'EG'], tier: 'HERITAGE', origin: 'USA' },
  'RICK OWENS': { canonical: 'Rick Owens', aliases: ['릭오웬스'], tier: 'HERITAGE', origin: 'USA' },
  'RAF SIMONS': { canonical: 'Raf Simons', aliases: ['라프시몬스'], tier: 'HERITAGE', origin: 'Belgium' },
  'JIL SANDER': { canonical: 'Jil Sander', aliases: ['질샌더'], tier: 'HERITAGE', origin: 'Germany' },
  'MARNI': { canonical: 'Marni', aliases: ['마르니'], tier: 'HERITAGE', origin: 'Italy' },
  'LEMAIRE': { canonical: 'Lemaire', aliases: ['르메르'], tier: 'HERITAGE', origin: 'France' },
  'OUR LEGACY': { canonical: 'Our Legacy', aliases: ['아워레가시'], tier: 'HERITAGE', origin: 'Sweden' },
  'AMI': { canonical: 'AMI Paris', aliases: ['아미', 'AMI PARIS'], tier: 'HERITAGE', origin: 'France' },
  'HUMAN MADE': { canonical: 'Human Made', aliases: ['휴먼메이드'], tier: 'JAPAN', origin: 'Japan' },
  'WACKO MARIA': { canonical: 'Wacko Maria', aliases: ['와코마리아'], tier: 'JAPAN', origin: 'Japan' },
  'WHITE MOUNTAINEERING': { canonical: 'White Mountaineering', aliases: ['화이트마운티니어링'], tier: 'JAPAN', origin: 'Japan' },
  'NIGEL CABOURN': { canonical: 'Nigel Cabourn', aliases: ['나이젤케이본'], tier: 'BRITISH', origin: 'UK' },
  'SOPHNET': { canonical: 'Sophnet', aliases: ['소프넷'], tier: 'JAPAN', origin: 'Japan' },

  // ===== JAPAN ARCHIVE (CONTEMPORARY / CASUAL) =====
  'URBAN RESEARCH': { canonical: 'Urban Research', aliases: ['어반리서치', '어반 리서치'], tier: 'JAPAN', origin: 'Japan' },
  'BEAMS': { canonical: 'Beams', aliases: ['빔즈', 'BEAMS PLUS', 'BEAMS BOY', 'BEAMS T'], tier: 'JAPAN', origin: 'Japan' },
  'UNITED ARROWS': { canonical: 'United Arrows', aliases: ['유나이티드아로우즈', 'UA', 'BEAUTY&YOUTH', 'GREEN LABEL RELAXING'], tier: 'JAPAN', origin: 'Japan' },
  'JOURNAL STANDARD': { canonical: 'Journal Standard', aliases: ['저널스탠다드'], tier: 'JAPAN', origin: 'Japan' },
  'NANAMICA': { canonical: 'Nanamica', aliases: ['나나미카'], tier: 'JAPAN', origin: 'Japan' },
  'SHIPS': { canonical: 'Ships', aliases: ['쉽스'], tier: 'JAPAN', origin: 'Japan' },
  'TOMORROWLAND': { canonical: 'Tomorrowland', aliases: ['투모로우랜드'], tier: 'JAPAN', origin: 'Japan' },
  'NANO UNIVERSE': { canonical: 'Nano Universe', aliases: ['나노유니버스'], tier: 'JAPAN', origin: 'Japan' },
  'STUDIOUS': { canonical: 'Studious', aliases: ['스튜디오스'], tier: 'JAPAN', origin: 'Japan' },
  'COS': { canonical: 'COS', aliases: ['코스'], tier: 'HERITAGE', origin: 'Sweden' },
  'MUJI': { canonical: 'Muji', aliases: ['무인양품', 'MUJI LABO', '무지'], tier: 'JAPAN', origin: 'Japan' },
  'LOWRYS FARM': { canonical: 'Lowrys Farm', aliases: ['로리즈팜'], tier: 'JAPAN', origin: 'Japan' },
  'GLOBAL WORK': { canonical: 'Global Work', aliases: ['글로벌워크'], tier: 'JAPAN', origin: 'Japan' },
  'COEN': { canonical: 'Coen', aliases: ['코엔'], tier: 'JAPAN', origin: 'Japan' },
  'SENSE OF PLACE': { canonical: 'Sense of Place', aliases: ['센스오브플레이스'], tier: 'JAPAN', origin: 'Japan' },
  'AZUL BY MOUSSY': { canonical: 'Azul by Moussy', aliases: ['아주르', '아주르 바이 모우지', 'MOUSSY'], tier: 'JAPAN', origin: 'Japan' },
  'FREAK\'S STORE': { canonical: 'Freak\'s Store', aliases: ['프릭스스토어'], tier: 'JAPAN', origin: 'Japan' },
  'EDIFICE': { canonical: 'Edifice', aliases: ['에디피스'], tier: 'JAPAN', origin: 'Japan' },
  'IENA': { canonical: 'Iena', aliases: ['이에나'], tier: 'JAPAN', origin: 'Japan' },
  'SPICK AND SPAN': { canonical: 'Spick and Span', aliases: ['스픽앤스판'], tier: 'JAPAN', origin: 'Japan' },
  'ADAM ET ROPE': { canonical: 'Adam et Rope', aliases: ['아담에로페'], tier: 'JAPAN', origin: 'Japan' },
  'DESIGNWORKS': { canonical: 'Designworks', aliases: ['디자인웍스'], tier: 'JAPAN', origin: 'Japan' },
  'AXES FEMME': { canonical: 'Axes Femme', aliases: ['액시즈팜'], tier: 'JAPAN', origin: 'Japan' },
  'ROPE PICNIC': { canonical: 'Rope Picnic', aliases: ['로프피크닉'], tier: 'JAPAN', origin: 'Japan' },
  'NICE CLAUP': { canonical: 'Nice Claup', aliases: ['나이스클랍'], tier: 'JAPAN', origin: 'Japan' },
  'SNIDEL': { canonical: 'Snidel', aliases: ['스나이델'], tier: 'JAPAN', origin: 'Japan' },
  'FRAY I.D': { canonical: 'Fray I.D', aliases: ['프레이아이디'], tier: 'JAPAN', origin: 'Japan' },
  'BEAUTY&YOUTH': { canonical: 'Beauty & Youth', aliases: ['뷰티앤유스'], tier: 'JAPAN', origin: 'Japan' },
  'GOLDEN BEAR': { canonical: 'Golden Bear', aliases: ['골든베어', '잭니클라우스'], tier: 'HERITAGE', origin: 'USA' },
  'HONEYSUCKLE ROSE': { canonical: 'Honeysuckle Rose', aliases: ['허니서클로즈'], tier: 'JAPAN', origin: 'Japan' },
  'AS KNOW AS': { canonical: 'As Know As', aliases: ['애즈노애즈', 'AS KNOW AS PINKY'], tier: 'JAPAN', origin: 'Japan' },

  // ===== HERITAGE / BRITISH / OTHER (SPORTS & CASUAL) =====
  'NIKE': { canonical: 'Nike', aliases: ['나이키'], tier: 'HERITAGE', origin: 'USA' },
  'ADIDAS': { canonical: 'Adidas', aliases: ['아디다스', 'ADIDAS NEO', 'ADIDAS ORIGINALS'], tier: 'HERITAGE', origin: 'Germany' },
  'FILA': { canonical: 'Fila', aliases: ['필라'], tier: 'HERITAGE', origin: 'Italy' },
  'PUMA': { canonical: 'Puma', aliases: ['푸마'], tier: 'HERITAGE', origin: 'Germany' },
  'NEW BALANCE': { canonical: 'New Balance', aliases: ['뉴발란스', 'NB'], tier: 'HERITAGE', origin: 'USA' },
  'REEBOK': { canonical: 'Reebok', aliases: ['리복'], tier: 'HERITAGE', origin: 'UK' },
  'CONVERSE': { canonical: 'Converse', aliases: ['컨버스'], tier: 'HERITAGE', origin: 'USA' },
  'CHAMPION': { canonical: 'Champion', aliases: ['챔피온'], tier: 'HERITAGE', origin: 'USA' },
  'STUSSY': { canonical: 'Stussy', aliases: ['스투시'], tier: 'HERITAGE', origin: 'USA' },
  'VANS': { canonical: 'Vans', aliases: ['반스'], tier: 'HERITAGE', origin: 'USA' },
  'ASICS': { canonical: 'Asics', aliases: ['아식스'], tier: 'JAPAN', origin: 'Japan' },
  'UNDER ARMOUR': { canonical: 'Under Armour', aliases: ['언더아머', 'UA'], tier: 'HERITAGE', origin: 'USA' },
  'KAPPA': { canonical: 'Kappa', aliases: ['카파'], tier: 'HERITAGE', origin: 'Italy' },
  'ELLESSE': { canonical: 'Ellesse', aliases: ['엘레쎄'], tier: 'HERITAGE', origin: 'Italy' },
  'UMBRO': { canonical: 'Umbro', aliases: ['엄브로'], tier: 'BRITISH', origin: 'UK' },
  'MIZUNO': { canonical: 'Mizuno', aliases: ['미즈노'], tier: 'JAPAN', origin: 'Japan' },
  'DESCENTE': { canonical: 'Descente', aliases: ['데상트'], tier: 'JAPAN', origin: 'Japan' },
  'UNIQLO': { canonical: 'Uniqlo', aliases: ['유니클로'], tier: 'JAPAN', origin: 'Japan' },
  'GAP': { canonical: 'Gap', aliases: ['갭'], tier: 'OTHER', origin: 'USA' },
  'H&M': { canonical: 'H&M', aliases: ['에이치앤엠'], tier: 'OTHER', origin: 'Sweden' },
  'ZARA': { canonical: 'Zara', aliases: ['자라'], tier: 'OTHER', origin: 'Spain' },
  'LEVI\'S': { canonical: 'Levi\'s', aliases: ['리바이스', 'LEVIS'], tier: 'HERITAGE', origin: 'USA' },
  'LEE': { canonical: 'Lee', aliases: ['리'], tier: 'HERITAGE', origin: 'USA' },
  'WRANGLER': { canonical: 'Wrangler', aliases: ['랭글러'], tier: 'HERITAGE', origin: 'USA' },
  'BANANA REPUBLIC': { canonical: 'Banana Republic', aliases: ['바나나리퍼블릭'], tier: 'OTHER', origin: 'USA' },
  'OLD NAVY': { canonical: 'Old Navy', aliases: ['올드네이비'], tier: 'OTHER', origin: 'USA' },
  'MANGO': { canonical: 'Mango', aliases: ['망고'], tier: 'OTHER', origin: 'Spain' },
  'TOPSHOP': { canonical: 'Topshop', aliases: ['탑샵'], tier: 'OTHER', origin: 'UK' },
  'BERSHKA': { canonical: 'Bershka', aliases: ['베르쉬카'], tier: 'OTHER', origin: 'Spain' },
  'FOREVER 21': { canonical: 'Forever 21', aliases: ['포에버21'], tier: 'OTHER', origin: 'USA' },
  'PULL&BEAR': { canonical: 'Pull & Bear', aliases: ['풀앤베어'], tier: 'OTHER', origin: 'Spain' },
  'GU': { canonical: 'GU', aliases: ['지유'], tier: 'JAPAN', origin: 'Japan' },
  'ESPRIT': { canonical: 'Esprit', aliases: ['에스프리'], tier: 'OTHER', origin: 'USA' },

  // ===== HERITAGE / OTHER (OUTDOOR) =====
  'THE NORTH FACE': { canonical: 'The North Face', aliases: ['노스페이스', 'TNF'], tier: 'HERITAGE', origin: 'USA' },
  'PATAGONIA': { canonical: 'Patagonia', aliases: ['파타고니아'], tier: 'HERITAGE', origin: 'USA' },
  'ARC\'TERYX': { canonical: 'Arc\'teryx', aliases: ['아크테릭스', 'ARCTERYX'], tier: 'HERITAGE', origin: 'Canada' },
  'COLUMBIA': { canonical: 'Columbia', aliases: ['컬럼비아'], tier: 'OTHER', origin: 'USA' },
  'HELLY HANSEN': { canonical: 'Helly Hansen', aliases: ['헬리한센'], tier: 'HERITAGE', origin: 'Norway' },
  'PENDLETON': { canonical: 'Pendleton', aliases: ['펜들턴'], tier: 'HERITAGE', origin: 'USA' },
  'WOOLRICH': { canonical: 'Woolrich', aliases: ['울리치'], tier: 'HERITAGE', origin: 'USA' },
  'L.L.BEAN': { canonical: 'L.L.Bean', aliases: ['엘엘빈', 'LL BEAN', 'LLBEAN'], tier: 'HERITAGE', origin: 'USA' },
  'EDDIE BAUER': { canonical: 'Eddie Bauer', aliases: ['에디바우어'], tier: 'HERITAGE', origin: 'USA' },
  'SIERRA DESIGNS': { canonical: 'Sierra Designs', aliases: ['시에라디자인'], tier: 'HERITAGE', origin: 'USA' },
  'MONT-BELL': { canonical: 'Mont-bell', aliases: ['몽벨', 'MONTBELL'], tier: 'JAPAN', origin: 'Japan' },
  'MAMMUT': { canonical: 'Mammut', aliases: ['마무트'], tier: 'HERITAGE', origin: 'Switzerland' },
  'SALOMON': { canonical: 'Salomon', aliases: ['살로몬'], tier: 'HERITAGE', origin: 'France' },
  'MARMOT': { canonical: 'Marmot', aliases: ['마모트'], tier: 'HERITAGE', origin: 'USA' },
  'K2': { canonical: 'K2', aliases: ['케이투'], tier: 'OTHER', origin: 'Korea' },
  'BLACK YAK': { canonical: 'Black Yak', aliases: ['블랙야크'], tier: 'OTHER', origin: 'Korea' },
  'KOLON SPORT': { canonical: 'Kolon Sport', aliases: ['코오롱스포츠'], tier: 'OTHER', origin: 'Korea' },

  // ===== WORKWEAR =====
  'CARHARTT': { canonical: 'Carhartt', aliases: ['칼하트', 'CARHARTT WIP'], tier: 'WORKWEAR', origin: 'USA' },
  'DICKIES': { canonical: 'Dickies', aliases: ['디키즈'], tier: 'WORKWEAR', origin: 'USA' },
  'RED KAP': { canonical: 'Red Kap', aliases: ['레드캡', 'REDKAP'], tier: 'WORKWEAR', origin: 'USA' },
  'BEN DAVIS': { canonical: 'Ben Davis', aliases: ['벤데이비스', 'BENDAVIS'], tier: 'WORKWEAR', origin: 'USA' },
  'FILSON': { canonical: 'Filson', aliases: ['필슨'], tier: 'WORKWEAR', origin: 'USA' },

  // ===== MILITARY =====
  'ALPHA INDUSTRIES': { canonical: 'Alpha Industries', aliases: ['알파인더스트리즈', 'ALPHA'], tier: 'MILITARY', origin: 'USA' },
  'ROTHCO': { canonical: 'Rothco', aliases: ['로스코'], tier: 'MILITARY', origin: 'USA' },
  'PROPPER': { canonical: 'Propper', aliases: ['프로퍼'], tier: 'MILITARY', origin: 'USA' },
};

// === 검색용 인덱스 구축 ===

// 정규화된 키 → 브랜드 정보 맵 (canonical key + alias 모두 포함)
const LOOKUP_MAP = new Map<string, BrandInfo>();

// 긴 키부터 매칭하기 위해 키 길이 순 정렬
const SORTED_KEYS: string[] = [];

function buildIndex() {
  for (const [key, info] of Object.entries(DB)) {
    const normalizedKey = key.toUpperCase();
    LOOKUP_MAP.set(normalizedKey, info);
    SORTED_KEYS.push(normalizedKey);

    for (const alias of info.aliases) {
      LOOKUP_MAP.set(alias.toUpperCase(), info);
      SORTED_KEYS.push(alias.toUpperCase());
    }
  }
  // 긴 키부터 매칭 (POLO RALPH LAUREN > POLO)
  SORTED_KEYS.sort((a, b) => b.length - a.length);
}
buildIndex();

export function lookupBrand(brandName: string): { info: BrandInfo | null; tier: BrandTier } {
  const normalized = brandName.toUpperCase().trim();

  // 1. 정확히 일치
  const exact = LOOKUP_MAP.get(normalized);
  if (exact) return { info: exact, tier: exact.tier };

  // 2. 입력값이 DB 키를 포함하거나, DB 키가 입력값을 포함
  for (const key of SORTED_KEYS) {
    if (normalized.includes(key) || key.includes(normalized)) {
      const info = LOOKUP_MAP.get(key)!;
      return { info, tier: info.tier };
    }
  }

  return { info: null, tier: 'OTHER' };
}

export { DB as BRAND_DATABASE };
