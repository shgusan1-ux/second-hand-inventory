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
  // noStore(); // remove if not defined or import it, usually revalidatePath handles it, or 'export const dynamic'
  try {
    const now = new Date();

    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // 모든 판매중 상품 가져오기
    const allProducts = await db.query(`
        SELECT * FROM products 
        WHERE status = '판매중'
        ORDER BY created_at DESC
    `);

    const products = allProducts.rows;
    const usedIds = new Set<string>();

    // 1. NEW: Created within 7 days
    const newItems = products.filter(p => {
      const createdAt = new Date(p.created_at);
      if (createdAt >= sevenDaysAgo) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 2. CURATED: Price >= 50000 AND Condition IN ('S', 'A급', 'A')
    const curatedItems = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const condition = p.condition || '';
      if (p.price_sell >= 50000 && (condition.includes('S') || condition === 'A급' || condition === 'A')) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 3. ARCHIVE 분류 (5개 서브카테고리)

    // 3-1. MILITARY ARCHIVE
    const militaryKeywords = ['M65', 'MA-1', 'MA1', 'BDU', 'CARGO', '카고', 'MILITARY', '밀리터리', 'ARMY', 'NAVY', 'AIR FORCE', 'USMC', 'ALPHA', 'ROTHCO', 'PROPPER'];
    const militaryArchive = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const searchText = `${p.name} ${p.brand}`.toUpperCase();
      if (militaryKeywords.some(kw => searchText.includes(kw.toUpperCase()))) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 3-2. WORKWEAR ARCHIVE
    const workwearKeywords = ['CARHARTT', 'DICKIES', 'DENIM', '데님', 'WORKWEAR', '워크웨어', 'COVERALL', 'OVERALLS', 'PAINTER', 'MECHANIC', 'WORK JACKET', 'WORK PANTS'];
    const workwearArchive = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const searchText = `${p.name} ${p.brand}`.toUpperCase();
      if (workwearKeywords.some(kw => searchText.includes(kw.toUpperCase()))) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 3-3. JAPAN ARCHIVE
    const japanBrands = ['VISVIM', 'KAPITAL', 'NEIGHBORHOOD', 'WTAPS', 'UNDERCOVER', 'COMME DES GARCONS', 'YOHJI YAMAMOTO', 'ISSEY MIYAKE', 'NANAMICA', 'ENGINEERED GARMENTS', 'NEEDLES', 'PORTER', 'BEAMS', 'UNITED ARROWS'];
    const japanArchive = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const brand = (p.brand || '').toUpperCase();
      const name = (p.name || '').toUpperCase();
      if (japanBrands.some(jb => brand.includes(jb) || name.includes(jb))) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 3-4. HERITAGE EUROPE
    const europeBrands = ['BARBOUR', 'BURBERRY', 'AQUASCUTUM', 'LAVENHAM', 'MACKINTOSH', 'DAKS', 'GRENFELL', 'JOHN SMEDLEY', 'PRINGLE', 'LYLE & SCOTT'];
    const heritageEurope = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const brand = (p.brand || '').toUpperCase();
      const name = (p.name || '').toUpperCase();
      if (europeBrands.some(eb => brand.includes(eb) || name.includes(eb))) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 3-5. BRITISH ARCHIVE
    const britishBrands = ['FRED PERRY', 'BEN SHERMAN', 'BARACUTA', 'CLARKS', 'DR. MARTENS', 'DR MARTENS', 'PAUL SMITH', 'MARGARET HOWELL', 'SUNSPEL', 'PRIVATE WHITE'];
    const britishArchive = products.filter(p => {
      if (usedIds.has(p.id)) return false;
      const brand = (p.brand || '').toUpperCase();
      const name = (p.name || '').toUpperCase();
      if (britishBrands.some(bb => brand.includes(bb) || name.includes(bb))) {
        usedIds.add(p.id);
        return true;
      }
      return false;
    });

    // 4. CLEARANCE: Created > 30 days ago AND NOT in any other category
    const clearanceItems = products.filter(p => {
      if (usedIds.has(p.id)) return false; // 다른 카테고리에 이미 포함된 상품 제외
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
