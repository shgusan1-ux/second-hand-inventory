import { db } from '@/lib/db';
import { Card, CardContent } from '@/components/ui/card';
import { InventoryFilter } from '@/components/inventory/inventory-filter';
import { InventoryTable } from '@/components/inventory/inventory-table';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string;
        category?: string;
        categories?: string;
        conditions?: string;
        sizes?: string;
        status?: string;
        excludeCode?: string;
        startDate?: string;
        endDate?: string;
        limit?: string;
        page?: string;
        sort?: string;
        order?: string;
    }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams.q || '';
    const excludeCode = resolvedParams.excludeCode || '';
    const startDate = resolvedParams.startDate || '';
    const endDate = resolvedParams.endDate || '';
    const statusParam = resolvedParams.status || '';
    const categoriesParam = resolvedParams.category /* legacy */ || resolvedParams.categories || '';
    const conditionsParam = resolvedParams.conditions || '';
    const sizesParam = resolvedParams.sizes || '';

    // Pagination
    const page = parseInt(resolvedParams.page || '1', 10);
    const limit = parseInt(resolvedParams.limit || '50', 10);
    const safeLimit = isNaN(limit) ? 50 : Math.min(limit, 1000);
    const offset = (page - 1) * safeLimit;

    // Build SQL Conditions
    let sqlConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Status Filter logic
    if (statusParam) {
        const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean);
        if (statuses.length > 0) {
            const placeholders = statuses.map(() => `$${paramIndex++}`);
            sqlConditions.push(`status IN (${placeholders.join(', ')})`);
            params.push(...statuses);
        }
    } else {
        sqlConditions.push(`status != '폐기'`);
    }

    // Category Filter
    if (categoriesParam) {
        const cats = categoriesParam.split(',').map(s => s.trim()).filter(Boolean);
        if (cats.length > 0) {
            const placeholders = cats.map(() => `$${paramIndex++}`);
            sqlConditions.push(`category IN (${placeholders.join(', ')})`);
            params.push(...cats);
        }
    }

    // Condition Filter
    if (conditionsParam) {
        const conds = conditionsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (conds.length > 0) {
            const placeholders = conds.map(() => `$${paramIndex++}`);
            sqlConditions.push(`condition IN (${placeholders.join(', ')})`);
            params.push(...conds);
        }
    }

    // Size Filter
    if (sizesParam) {
        const sizes = sizesParam.split(',').map(s => s.trim()).filter(Boolean);
        if (sizes.length > 0) {
            const placeholders = sizes.map(() => `$${paramIndex++}`);
            sqlConditions.push(`size IN (${placeholders.join(', ')})`);
            params.push(...sizes);
        }
    }

    // Search Query
    if (query) {
        // Bulk Search Logic: Check for comma or newline separators
        // This allows users to paste multiple IDs to find them quickly
        const terms = query.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

        if (terms.length > 1) {
            // Bulk ID Search Mode
            const placeholders = terms.map(() => `$${paramIndex++}`);
            sqlConditions.push(`id IN (${placeholders.join(', ')})`);
            params.push(...terms);
        } else {
            // Single Term Broad Search Mode
            sqlConditions.push(`(name LIKE $${paramIndex} OR id LIKE $${paramIndex} OR brand LIKE $${paramIndex})`);
            params.push(`%${query}%`);
            paramIndex++;
        }
    }

    // Exclude Code
    if (excludeCode) {
        const excludes = excludeCode.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
        if (excludes.length > 0) {
            const placeholders = excludes.map(() => `$${paramIndex++}`);
            sqlConditions.push(`id NOT IN (${placeholders.join(', ')})`);
            params.push(...excludes);
        }
    }

    // Date Range
    if (startDate) {
        sqlConditions.push(`created_at >= $${paramIndex}`);
        params.push(`${startDate} 00:00:00`);
        paramIndex++;
    }

    if (endDate) {
        sqlConditions.push(`created_at <= $${paramIndex}`);
        params.push(`${endDate} 23:59:59`);
        paramIndex++;
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    // 1. Fetch Total Count for Pagination
    // Note: We cast the result to avoid TS errors with specific DB adapter return types
    const countSql = `SELECT COUNT(*) as count FROM products ${whereClause}`;
    const countResult = await db.query(countSql, params);
    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

    // Sort Logic
    const sort = resolvedParams.sort || 'created_at';
    const order = resolvedParams.order || 'desc';

    // Whitelist sort fields
    const validSorts = ['id', 'name', 'price_sell', 'status', 'created_at'];
    const safeSort = validSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    // 2. Fetch Data
    const dataSql = `SELECT * FROM products ${whereClause} ORDER BY ${safeSort} ${safeOrder} LIMIT ${safeLimit} OFFSET ${offset}`;
    // Warning: We must NOT pass LIMIT/OFFSET as params because we hardcoded them in string.
    // The `params` array matches the placeholders in `whereClause`.
    const result = await db.query(dataSql, params);
    const products = result.rows;

    // 3. Fetch Brands for Filter
    const brandResult = await db.query('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != \'\' ORDER BY brand ASC');
    const brands = brandResult.rows.map(r => r.brand);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">재고 목록</h1>
                <p className="text-sm font-medium text-slate-500">원하는 상품을 빠르게 찾을 수 있는 페이지입니다.</p>
            </div>

            <InventoryFilter brands={brands} />

            {/* Render Client Component Table */}
            <InventoryTable
                products={products}
                totalCount={totalCount}
                limit={safeLimit}
                currentPage={page}
            />
        </div>
    );
}
