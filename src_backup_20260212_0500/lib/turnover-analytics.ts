/**
 * 회전율 분석 시스템
 * 
 * 핵심 지표:
 * 1. 평균 판매까지 걸린 시간
 * 2. 카테고리별 회전율
 * 3. 가격대별 회전율
 * 4. 폐기 추천 (90일 이상 미판매)
 */

import { db } from './db';

export interface TurnoverMetrics {
    // 전체 통계
    totalProducts: number;
    soldProducts: number;
    activeProducts: number;

    // 평균 판매 시간
    averageDaysToSell: number;
    medianDaysToSell: number;

    // 카테고리별 회전율
    categoryTurnover: Array<{
        category: string;
        totalCount: number;
        soldCount: number;
        turnoverRate: number; // %
        avgDaysToSell: number;
    }>;

    // 가격대별 회전율
    priceRangeTurnover: Array<{
        priceRange: string;
        minPrice: number;
        maxPrice: number;
        totalCount: number;
        soldCount: number;
        turnoverRate: number; // %
        avgDaysToSell: number;
    }>;

    // 폐기 추천 상품
    discardRecommendations: Array<{
        id: string;
        name: string;
        category: string;
        price_sell: number;
        daysInInventory: number;
        reason: string;
    }>;
}

/**
 * 회전율 지표 계산
 */
export async function calculateTurnoverMetrics(): Promise<TurnoverMetrics> {
    // 1. 전체 통계
    const totalResult = await db.query(`
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = '판매완료' THEN 1 END) as sold,
            COUNT(CASE WHEN status IN ('판매중', '판매대기') THEN 1 END) as active
        FROM products
        WHERE status != '폐기'
    `);

    const { total, sold, active } = totalResult.rows[0];

    // 2. 평균 판매 시간 계산
    const sellTimeResult = await db.query(`
        SELECT 
            AVG(JULIANDAY(sold_at) - JULIANDAY(created_at)) as avg_days,
            CAST(AVG(JULIANDAY(sold_at) - JULIANDAY(created_at)) AS INTEGER) as median_days
        FROM products
        WHERE status = '판매완료' AND sold_at IS NOT NULL
    `);

    const avgDaysToSell = sellTimeResult.rows[0]?.avg_days || 0;
    const medianDaysToSell = sellTimeResult.rows[0]?.median_days || 0;

    // 3. 카테고리별 회전율
    const categoryResult = await db.query(`
        SELECT 
            category,
            COUNT(*) as total_count,
            COUNT(CASE WHEN status = '판매완료' THEN 1 END) as sold_count,
            AVG(CASE 
                WHEN status = '판매완료' AND sold_at IS NOT NULL 
                THEN JULIANDAY(sold_at) - JULIANDAY(created_at)
                ELSE NULL
            END) as avg_days
        FROM products
        WHERE status != '폐기'
        GROUP BY category
        ORDER BY sold_count DESC
    `);

    const categoryTurnover = categoryResult.rows.map((row: any) => ({
        category: row.category,
        totalCount: parseInt(row.total_count),
        soldCount: parseInt(row.sold_count),
        turnoverRate: (parseInt(row.sold_count) / parseInt(row.total_count)) * 100,
        avgDaysToSell: parseFloat(row.avg_days) || 0,
    }));

    // 4. 가격대별 회전율
    const priceRanges = [
        { label: '0-10만원', min: 0, max: 100000 },
        { label: '10-20만원', min: 100000, max: 200000 },
        { label: '20-30만원', min: 200000, max: 300000 },
        { label: '30-50만원', min: 300000, max: 500000 },
        { label: '50만원 이상', min: 500000, max: 999999999 },
    ];

    const priceRangeTurnover = [];

    for (const range of priceRanges) {
        const priceResult = await db.query(`
            SELECT 
                COUNT(*) as total_count,
                COUNT(CASE WHEN status = '판매완료' THEN 1 END) as sold_count,
                AVG(CASE 
                    WHEN status = '판매완료' AND sold_at IS NOT NULL 
                    THEN JULIANDAY(sold_at) - JULIANDAY(created_at)
                    ELSE NULL
                END) as avg_days
            FROM products
            WHERE status != '폐기' 
                AND price_sell >= ${range.min} 
                AND price_sell < ${range.max}
        `);

        const row = priceResult.rows[0];
        priceRangeTurnover.push({
            priceRange: range.label,
            minPrice: range.min,
            maxPrice: range.max,
            totalCount: parseInt(row.total_count),
            soldCount: parseInt(row.sold_count),
            turnoverRate: parseInt(row.total_count) > 0
                ? (parseInt(row.sold_count) / parseInt(row.total_count)) * 100
                : 0,
            avgDaysToSell: parseFloat(row.avg_days) || 0,
        });
    }

    // 5. 폐기 추천 (90일 이상 미판매)
    const discardResult = await db.query(`
        SELECT 
            id, 
            name, 
            category, 
            price_sell,
            JULIANDAY('now') - JULIANDAY(created_at) as days_in_inventory
        FROM products
        WHERE status IN ('판매중', '판매대기')
            AND JULIANDAY('now') - JULIANDAY(created_at) >= 90
        ORDER BY days_in_inventory DESC
        LIMIT 50
    `);

    const discardRecommendations = discardResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        price_sell: row.price_sell,
        daysInInventory: Math.floor(row.days_in_inventory),
        reason: `${Math.floor(row.days_in_inventory)}일 이상 미판매`,
    }));

    return {
        totalProducts: parseInt(total),
        soldProducts: parseInt(sold),
        activeProducts: parseInt(active),
        averageDaysToSell: Math.round(avgDaysToSell),
        medianDaysToSell: Math.round(medianDaysToSell),
        categoryTurnover,
        priceRangeTurnover,
        discardRecommendations,
    };
}

/**
 * 자동 단계 이동 로직
 * 
 * 규칙:
 * - 30일 이상 미판매 → CLEARANCE로 이동
 * - 60일 이상 미판매 → 가격 10% 할인
 * - 90일 이상 미판매 → 가격 20% 할인 + 폐기 추천
 */
export async function autoStageTransition() {
    const results = {
        movedToClearance: 0,
        priceReduced10: 0,
        priceReduced20: 0,
    };

    // 1. 30일 이상 → CLEARANCE
    const clearanceResult = await db.query(`
        UPDATE products
        SET status = '판매대기'
        WHERE status = '판매중'
            AND JULIANDAY('now') - JULIANDAY(created_at) >= 30
            AND JULIANDAY('now') - JULIANDAY(created_at) < 60
    `);
    results.movedToClearance = clearanceResult.rowCount || 0;

    // 2. 60일 이상 → 10% 할인
    const products60 = await db.query(`
        SELECT id, price_sell, price_consumer
        FROM products
        WHERE status IN ('판매중', '판매대기')
            AND JULIANDAY('now') - JULIANDAY(created_at) >= 60
            AND JULIANDAY('now') - JULIANDAY(created_at) < 90
    `);

    for (const product of products60.rows) {
        const newPrice = Math.floor(product.price_sell * 0.9);
        await db.query(`
            UPDATE products
            SET price_sell = ${newPrice}
            WHERE id = '${product.id}'
        `);
        results.priceReduced10++;
    }

    // 3. 90일 이상 → 20% 할인
    const products90 = await db.query(`
        SELECT id, price_sell, price_consumer
        FROM products
        WHERE status IN ('판매중', '판매대기')
            AND JULIANDAY('now') - JULIANDAY(created_at) >= 90
    `);

    for (const product of products90.rows) {
        const newPrice = Math.floor(product.price_sell * 0.8);
        await db.query(`
            UPDATE products
            SET price_sell = ${newPrice}
            WHERE id = '${product.id}'
        `);
        results.priceReduced20++;
    }

    return results;
}
