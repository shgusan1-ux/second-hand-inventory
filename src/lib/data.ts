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

    // 1. NEW: Created within 7 days
    // Fixed: Use standard SQL comparison with ISO date string parameter
    const newItems = await db.query(`
        SELECT * FROM products 
        WHERE created_at >= $1
        AND status = '판매중'
        ORDER BY created_at DESC LIMIT 50
        `, [sevenDaysAgoStr]);

    // 2. CURATED: Price >= 50000 AND Condition IN ('S', 'A급', 'A')
    const curatedItems = await db.query(`
        SELECT * FROM products 
        WHERE price_sell >= 50000 
        AND (condition LIKE '%S%' OR condition = 'A급' OR condition = 'A')
        AND status = '판매중'
        ORDER BY price_sell DESC LIMIT 50
        `);

    // 3. ARCHIVE: Brand/Name contains 'Vintage' OR Condition contains 'V'
    const archiveItems = await db.query(`
        SELECT * FROM products 
        WHERE (name LIKE '%Vintage%' OR brand LIKE '%Vintage%' OR condition LIKE '%V%')
        AND status = '판매중'
        ORDER BY created_at DESC LIMIT 50
        `);

    // 4. CLEARANCE: Created > 30 days ago
    // Fixed: Use standard SQL comparison
    const clearanceItems = await db.query(`
        SELECT * FROM products 
        WHERE created_at <= $1
        AND status = '판매중'
        ORDER BY created_at ASC LIMIT 50
        `, [thirtyDaysAgoStr]);

    return {
      newItems: newItems.rows,
      curatedItems: curatedItems.rows,
      archiveItems: archiveItems.rows,
      clearanceItems: clearanceItems.rows,
    };
  } catch (error) {
    console.error('Database Error:', error);
    return { newItems: [], curatedItems: [], archiveItems: [], clearanceItems: [] };
  }
}
