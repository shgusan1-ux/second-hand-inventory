'use server';

import { db } from './db';

// --- Types ---
export interface RegistrationStat {
    date: string;
    count: number;
}

export interface DetailedRegStats {
    daily: RegistrationStat[];
    weeklyAvg: number;  // (Last 7 days total) / 7
    monthlyAvg: number; // (Last 30 days total) / 30
    lastMonthTotal: number;
    thisMonthTotal: number;
}

export interface MonthlyFlowStat {
    month: string; // YYYY-MM
    in: number;    // Registered
    out: number;   // Sold
}

// --- Implementation ---

export async function getDetailedRegistrationStats(): Promise<DetailedRegStats> {
    try {
        // 1. Daily Stats (Recent 14 days)
        // Ensure timezone consistency. 'date(now)' uses UTC by default in SQLite. 'localtime' modifier helps.
        // Actually, for simplicity and robustness, let's just query by string comparison if stored as 'YYYY-MM-DD'.
        // Our 'master_reg_date' is 'YYYY-MM-DD' (text) or ISO timestamp.
        // Let's assume standard 'YYYY-MM-DD'.

        const dailyQuery = `
            SELECT 
                DATE(master_reg_date) as date,
                COUNT(*) as count
            FROM products
            WHERE master_reg_date >= DATE('now', '-13 days')
            GROUP BY 1
            ORDER BY 1 ASC
        `;
        const dailyRes = await db.query(dailyQuery);

        // 2. Weekly Average (Last 7 days)
        // Distinct from "this week" (Mon-Sun). It's a rolling 7-day window.
        const weeklyQuery = `
            SELECT COUNT(*) as total
            FROM products
            WHERE master_reg_date >= DATE('now', '-6 days')
        `;
        const weeklyRes = await db.query(weeklyQuery);
        const weeklyTotal = weeklyRes.rows[0]?.total || 0;
        const weeklyAvg = Math.round(weeklyTotal / 7);

        // 3. Monthly Average (Last 30 days)
        const monthlyAvgQuery = `
            SELECT COUNT(*) as total
            FROM products
            WHERE master_reg_date >= DATE('now', '-29 days')
        `;
        const monthlyAvgRes = await db.query(monthlyAvgQuery);
        const monthlyTotal = monthlyAvgRes.rows[0]?.total || 0;
        const monthlyAvg = Math.round(monthlyTotal / 30);

        // 4. Last Month Total (Calendar Month)
        // e.g. If today is Feb 19, Last Month is Jan 01 - Jan 31.
        const lastMonthQuery = `
            SELECT COUNT(*) as total
            FROM products
            WHERE strftime('%Y-%m', master_reg_date) = strftime('%Y-%m', DATE('now', 'start of month', '-1 month'))
        `;
        const lastMonthRes = await db.query(lastMonthQuery);
        const lastMonthTotal = lastMonthRes.rows[0]?.total || 0;

        // 5. This Month Total (Calendar Month)
        const thisMonthQuery = `
            SELECT COUNT(*) as total
            FROM products
            WHERE strftime('%Y-%m', master_reg_date) = strftime('%Y-%m', DATE('now'))
        `;
        const thisMonthRes = await db.query(thisMonthQuery);
        const thisMonthTotal = thisMonthRes.rows[0]?.total || 0;

        return {
            daily: dailyRes.rows,
            weeklyAvg,
            monthlyAvg,
            lastMonthTotal,
            thisMonthTotal
        };
    } catch (e) {
        console.error("Failed to get detailed reg stats:", e);
        return {
            daily: [],
            weeklyAvg: 0,
            monthlyAvg: 0,
            lastMonthTotal: 0,
            thisMonthTotal: 0
        };
    }
}

export async function getInventoryFlowStats(): Promise<MonthlyFlowStat[]> {
    try {
        // IN: Based on master_reg_date (Use simple string truncation for YYYY-MM)
        const inQuery = `
            SELECT 
                substr(master_reg_date, 1, 7) as month,
                COUNT(*) as count
            FROM products
            WHERE master_reg_date >= date('now', 'start of month', '-11 months')
            GROUP BY 1
        `;
        const inRes = await db.query(inQuery);

        // OUT: Based on sold_at
        const outQuery = `
            SELECT 
                substr(sold_at, 1, 7) as month,
                COUNT(*) as count
            FROM products
            WHERE sold_at >= date('now', 'start of month', '-11 months')
              AND status = '판매완료'
            GROUP BY 1
        `;
        const outRes = await db.query(outQuery);

        // Merge results
        const statsMap = new Map<string, MonthlyFlowStat>();

        // Generate keys for the last 12 months (INCLUDING current month) using local time logic
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const key = `${year}-${month}`;
            statsMap.set(key, { month: key, in: 0, out: 0 });
        }

        // Fill Data
        if (inRes && inRes.rows) {
            inRes.rows.forEach((r: any) => {
                // Ensure r.month is YYYY-MM
                if (r.month && statsMap.has(r.month)) {
                    const s = statsMap.get(r.month)!;
                    s.in = Number(r.count);
                }
            });
        }

        if (outRes && outRes.rows) {
            outRes.rows.forEach((r: any) => {
                if (r.month && statsMap.has(r.month)) {
                    const s = statsMap.get(r.month)!;
                    s.out = Number(r.count);
                }
            });
        }

        // Convert to array and sort (Oldest to Newest)
        return Array.from(statsMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    } catch (e) {
        console.error("Failed to get flow stats:", e);
        return [];
    }
}
