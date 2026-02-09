import { db } from './db';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price_consumer: number;
  price_sell: number;
  status: string;
  condition: string;
  image_url: string | null;
  size: string | null;
  created_at: string;
  sold_at: string | null;
}

export interface DashboardStats {
  totalCount: number;
  totalValue: number;
  todayIn: number;
  todayOut: number;
  weekIn: number;
  weekOut: number;
  monthIn: number;
  monthOut: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();

  // Helpers for date ranges (local time approx for simple stats)
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfWeekStr = startOfWeek.toISOString();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Total Count & Value
  // Note: db.query returns result.rows
  const totalRes = await db.query(`
    SELECT COUNT(*) as count, SUM(price_sell) as value 
    FROM products 
    WHERE status = '판매중'
  `);
  const total = totalRes.rows[0] as { count: any, value: any };
  // postgres count is usually string, sqlite number. Safe parse.

  const todayInRes = await db.query(`SELECT COUNT(*) as count FROM products WHERE created_at >= $1`, [startOfDay]);
  const todayOutRes = await db.query(`SELECT COUNT(*) as count FROM products WHERE sold_at >= $1`, [startOfDay]);

  const weekInRes = await db.query(`SELECT COUNT(*) as count FROM products WHERE created_at >= $1`, [startOfWeekStr]);
  const weekOutRes = await db.query(`SELECT COUNT(*) as count FROM products WHERE sold_at >= $1`, [startOfWeekStr]);

  const monthInRes = await db.query(`SELECT COUNT(*) as count FROM products WHERE created_at >= $1`, [startOfMonth]);
  const monthOutRes = await db.query(`SELECT COUNT(*) as count FROM products WHERE sold_at >= $1`, [startOfMonth]);

  return {
    totalCount: Number(total.count || 0),
    totalValue: Number(total.value || 0),
    todayIn: Number(todayInRes.rows[0].count || 0),
    todayOut: Number(todayOutRes.rows[0].count || 0),
    weekIn: Number(weekInRes.rows[0].count || 0),
    weekOut: Number(weekOutRes.rows[0].count || 0),
    monthIn: Number(monthInRes.rows[0].count || 0),
    monthOut: Number(monthOutRes.rows[0].count || 0),
  };
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  classification: string;
}

export async function getCategories() {
  const result = await db.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
  return result.rows as Category[];
}

export async function getRecentProducts(limit = 5): Promise<Product[]> {
  // SQLite LIMIT ?, Postgres LIMIT $1
  // My adapter handles params? 
  // db.ts said it handles params. 
  const result = await db.query(`SELECT * FROM products ORDER BY created_at DESC LIMIT $1`, [limit]);
  return result.rows as Product[];
}

export async function getSmartStoreGroups() {
  try {
    const now = new Date();

    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 모든 판매중 상품 가져오기
    const allProducts = await db.query(`
        SELECT * FROM products 
        WHERE status = '판매중'
        ORDER BY created_at DESC
    `);

    const products = allProducts.rows;

    // 경과일 계산 함수
    const calculateDaysSince = (date: string | Date) => {
      const regDate = new Date(date);
      return Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    // 모든 상품에 경과일 추가
    products.forEach(p => {
      p.days_since_registration = calculateDaysSince(p.created_at);
    });

    // 점수 계산 함수
    const calculateScore = (product: any) => {
      let score = 0;

      // 1. 신선도 점수 (0-40점)
      const days = product.days_since_registration;
      if (days <= 7) score += 40;
      else if (days <= 14) score += 30;
      else if (days <= 21) score += 20;
      else if (days <= 30) score += 10;

      // 2. 등급 점수 (0-30점)
      const condition = (product.condition || '').toUpperCase();
      if (condition.includes('S')) score += 30;
      else if (condition.includes('A')) score += 20;
      else if (condition.includes('B')) score += 10;

      // 3. 가격대 점수 (0-20점) - 회전율 고려
      const price = product.price_sell || 0;
      if (price >= 30000 && price <= 100000) score += 20; // 최적 가격대
      else if (price >= 10000 && price < 30000) score += 15;
      else if (price >= 100000 && price <= 200000) score += 10;
      else score += 5;

      // 4. 카테고리 점수 (0-10점) - 나중에 추가
      // 분류 후 카테고리별로 점수 추가

      return score;
    };

    // 모든 상품에 점수 부여
    products.forEach(p => {
      p.score = calculateScore(p);
    });

    const usedIds = new Set<string>();

    // 1. NEW: Created within 7 days
    const newItems = products.filter(p => {
      const createdAt = new Date(p.created_at);
      if (createdAt >= sevenDaysAgo) {
        p.score += 6; // 카테고리 점수 추가
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 2. CURATED: S급만 (날짜 무관)
    const curatedItems = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const condition = (p.condition || '').toUpperCase().trim();
      // S급만 정확히 매칭 (S, S급, S+, S-, SS 등)
      const isSGrade = /^S[+\-]?$|^S급$|^SS$/.test(condition) || condition === 'S';
      if (isSGrade) {
        p.score += 10; // 카테고리 점수 추가
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    console.log(`CURATED 후보: ${products.filter(p => !usedIds.has(p.id)).length}개`);
    console.log(`CURATED 선택: ${curatedItems.length}개`);

    // 3. ARCHIVE 분류 - 키워드 기반
    const militaryArchive: any[] = [];
    const workwearArchive: any[] = [];
    const japanArchive: any[] = [];
    const heritageEurope: any[] = [];
    const britishArchive: any[] = [];

    const archiveCandidates = products.filter(p => !usedIds.has(p.id));
    console.log(`ARCHIVE 후보: ${archiveCandidates.length}개`);

    archiveCandidates.forEach(product => {
      const category = fallbackClassification(product);

      if (category !== 'NONE') {
        product.score += 8; // 아카이브 카테고리 점수
        usedIds.add(product.id);

        switch (category) {
          case 'MILITARY':
            militaryArchive.push(product);
            break;
          case 'WORKWEAR':
            workwearArchive.push(product);
            break;
          case 'JAPAN':
            japanArchive.push(product);
            break;
          case 'EUROPE':
            heritageEurope.push(product);
            break;
          case 'BRITISH':
            britishArchive.push(product);
            break;
        }
      }
    });

    console.log(`ARCHIVE 분류 결과:`);
    console.log(`- MILITARY: ${militaryArchive.length}개`);
    console.log(`- WORKWEAR: ${workwearArchive.length}개`);
    console.log(`- JAPAN: ${japanArchive.length}개`);
    console.log(`- EUROPE: ${heritageEurope.length}개`);
    console.log(`- BRITISH: ${britishArchive.length}개`);

    // 4. CLEARANCE: Created > 30 days ago AND NOT in any other category
    const clearanceItems = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const createdAt = new Date(p.created_at);
      if (createdAt <= thirtyDaysAgo) {
        p.score += 3; // 클리어런스 점수
        return true;
      }
      return false;
    });

    // 점수순으로 정렬
    newItems.sort((a, b) => b.score - a.score);
    curatedItems.sort((a, b) => b.score - a.score);
    militaryArchive.sort((a, b) => b.score - a.score);
    workwearArchive.sort((a, b) => b.score - a.score);
    japanArchive.sort((a, b) => b.score - a.score);
    heritageEurope.sort((a, b) => b.score - a.score);
    britishArchive.sort((a, b) => b.score - a.score);
    clearanceItems.sort((a, b) => b.score - a.score);

    // 5. ETC: 나머지 모든 상품
    const etcItems = products.filter(p => !usedIds.has(p.id));
    etcItems.forEach(p => {
      p.score += 1; // 기본 점수
    });
    etcItems.sort((a, b) => b.score - a.score);

    console.log(`ETC (미분류): ${etcItems.length}개`);
    console.log(`TOTAL PROCESSED: ${newItems.length + curatedItems.length + militaryArchive.length + workwearArchive.length + japanArchive.length + heritageEurope.length + britishArchive.length + clearanceItems.length + etcItems.length} / ${products.length}`);

    // 스마트스토어 제한 제거 - 모든 상품 반환
    return {
      newItems,
      curatedItems,
      militaryArchive,
      workwearArchive,
      japanArchive,
      heritageEurope,
      britishArchive,
      clearanceItems,
      etcItems, // 추가된 기타 카테고리
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      newItems: [],
      curatedItems: [],
      militaryArchive: [],
      workwearArchive: [],
      japanArchive: [],
      heritageEurope: [],
      britishArchive: [],
      clearanceItems: [],
      etcItems: []
    };
  }
}

// 키워드 기반 폴백 분류 함수
function fallbackClassification(product: any): string {
  const searchText = `${product.name} ${product.brand}`.toUpperCase();

  // MILITARY
  const militaryKeywords = ['M65', 'MA-1', 'MA1', 'BDU', 'CARGO', '카고', 'MILITARY', '밀리터리', 'ARMY', 'NAVY', 'AIR FORCE', 'USMC', 'ALPHA', 'ROTHCO', 'PROPPER'];
  if (militaryKeywords.some(kw => searchText.includes(kw.toUpperCase()))) {
    return 'MILITARY';
  }

  // WORKWEAR
  const workwearKeywords = ['CARHARTT', 'DICKIES', 'DENIM', '데님', 'WORKWEAR', '워크웨어', 'COVERALL', 'OVERALLS', 'PAINTER', 'MECHANIC'];
  if (workwearKeywords.some(kw => searchText.includes(kw.toUpperCase()))) {
    return 'WORKWEAR';
  }

  // JAPAN
  const japanBrands = ['VISVIM', 'KAPITAL', 'NEIGHBORHOOD', 'WTAPS', 'UNDERCOVER', 'COMME DES GARCONS', 'YOHJI YAMAMOTO', 'ISSEY MIYAKE', 'NANAMICA', 'ENGINEERED GARMENTS', 'NEEDLES'];
  if (japanBrands.some(jb => searchText.includes(jb))) {
    return 'JAPAN';
  }

  // EUROPE
  const europeBrands = ['BARBOUR', 'BURBERRY', 'AQUASCUTUM', 'LAVENHAM', 'MACKINTOSH', 'DAKS', 'GRENFELL'];
  if (europeBrands.some(eb => searchText.includes(eb))) {
    return 'EUROPE';
  }

  // BRITISH
  const britishBrands = ['FRED PERRY', 'BEN SHERMAN', 'BARACUTA', 'CLARKS', 'DR. MARTENS', 'DR MARTENS', 'PAUL SMITH', 'MARGARET HOWELL'];
  if (britishBrands.some(bb => searchText.includes(bb))) {
    return 'BRITISH';
  }

  // 기본값: 어떤 카테고리에도 속하지 않음
  return 'NONE';
}
