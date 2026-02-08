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
    const usedIds = new Set<string>();

    // 경과일 계산 함수
    const calculateDaysSince = (date: string | Date) => {
      const regDate = new Date(date);
      return Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
    };

    // 모든 상품에 경과일 추가
    products.forEach(p => {
      p.days_since_registration = calculateDaysSince(p.created_at);
    });

    // 1. NEW: Created within 7 days
    const newItems = products.filter(p => {
      const createdAt = new Date(p.created_at);
      if (createdAt >= sevenDaysAgo) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 2. CURATED: S급만 (날짜 무관)
    const curatedItems = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const condition = (p.condition || '').toUpperCase();
      // S급만 선택 (S, S급, S+, S- 등 모두 포함)
      if (condition.includes('S')) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 3. ARCHIVE 분류 - 키워드 기반
    const militaryArchive: any[] = [];
    const workwearArchive: any[] = [];
    const japanArchive: any[] = [];
    const heritageEurope: any[] = [];
    const britishArchive: any[] = [];

    // 아카이브 후보 (NEW, CURATED 제외)
    const archiveCandidates = products.filter(p => !usedIds.has(p.id));

    archiveCandidates.forEach(product => {
      const category = fallbackClassification(product);
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
        case 'NONE':
          // 어떤 카테고리에도 속하지 않음 - usedIds에서 제거
          usedIds.delete(product.id);
          break;
      }
    });

    // 4. CLEARANCE: Created > 30 days ago AND NOT in any other category
    const clearanceItems = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const createdAt = new Date(p.created_at);
      return createdAt <= thirtyDaysAgo;
    });

    return {
      newItems,
      curatedItems,
      militaryArchive,
      workwearArchive,
      japanArchive,
      heritageEurope,
      britishArchive,
      clearanceItems,
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
      clearanceItems: []
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
