import { Suspense } from 'react';
import { db } from '@/lib/db';
import { InventoryManager } from '@/components/inventory/inventory-manager';
import { getCategories } from '@/lib/data';

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
        field?: string;
        sort?: string;
        order?: string;
    }>;
}) {
    const resolvedParams = await searchParams;
    const query = resolvedParams.q || '';
    const searchField = resolvedParams.field || 'all';
    const excludeCode = resolvedParams.excludeCode || '';
    const startDate = resolvedParams.startDate || '';
    const endDate = resolvedParams.endDate || '';
    const statusParam = resolvedParams.status || '';
    const categoriesParam = resolvedParams.category || resolvedParams.categories || '';
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
            sqlConditions.push(`p.status IN (${placeholders.join(', ')})`);
            params.push(...statuses);
        }
    } else {
        sqlConditions.push(`p.status != '폐기'`);
    }

    // Category Filter
    if (categoriesParam) {
        const cats = categoriesParam.split(',').map(s => s.trim()).filter(Boolean);
        if (cats.length > 0) {
            const placeholders = cats.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.category IN (${placeholders.join(', ')})`);
            params.push(...cats);
        }
    }

    // Condition Filter
    if (conditionsParam) {
        const conds = conditionsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (conds.length > 0) {
            const placeholders = conds.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.condition IN (${placeholders.join(', ')})`);
            params.push(...conds);
        }
    }

    // Size Filter
    if (sizesParam) {
        const sizes = sizesParam.split(',').map(s => s.trim()).filter(Boolean);
        if (sizes.length > 0) {
            const placeholders = sizes.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.size IN (${placeholders.join(', ')})`);
            params.push(...sizes);
        }
    }

    // Search Query
    if (query) {
        const terms = query.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

        if (terms.length > 1) {
            const placeholders = terms.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.id IN (${placeholders.join(', ')})`);
            params.push(...terms);
        } else {
            if (searchField === 'name') {
                sqlConditions.push(`p.name LIKE $${paramIndex}`);
            } else if (searchField === 'id') {
                sqlConditions.push(`p.id LIKE $${paramIndex}`);
            } else if (searchField === 'brand') {
                sqlConditions.push(`p.brand LIKE $${paramIndex}`);
            } else {
                sqlConditions.push(`(p.name LIKE $${paramIndex} OR p.id LIKE $${paramIndex} OR p.brand LIKE $${paramIndex} OR c.name LIKE $${paramIndex} OR c.classification LIKE $${paramIndex})`);
            }
            params.push(`%${query.trim()}%`);
            paramIndex++;
        }
    }

    // Exclude Code
    if (excludeCode) {
        const excludes = excludeCode.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (excludes.length > 0) {
            const placeholders = excludes.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.id NOT IN (${placeholders.join(', ')})`);
            params.push(...excludes);
        }
    }

    // Date Range
    if (startDate) {
        sqlConditions.push(`p.created_at >= $${paramIndex}`);
        params.push(`${startDate} 00:00:00`);
        paramIndex++;
    }

    if (endDate) {
        sqlConditions.push(`p.created_at <= $${paramIndex}`);
        params.push(`${endDate} 23:59:59`);
        paramIndex++;
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    // Sort Logic
    const sort = resolvedParams.sort || 'created_at';
    const order = resolvedParams.order || 'desc';
    let dbSort = 'p.created_at';
    if (sort === 'id') dbSort = 'p.id';
    else if (sort === 'name') dbSort = 'p.name';
    else if (sort === 'price_sell') dbSort = 'p.price_sell';
    else if (sort === 'status') dbSort = 'p.status';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    let totalCount = 0;
    let products = [];

    try {
        const countRes = await db.query(`
            SELECT COUNT(*) as count 
            FROM products p
            LEFT JOIN categories c ON p.category = c.id
            ${whereClause}
        `, params);
        totalCount = parseInt(countRes.rows[0]?.count || '0', 10);

        const dataRes = await db.query(`
            SELECT p.*, c.name as category_name, c.classification as category_classification 
            FROM products p
            LEFT JOIN categories c ON p.category = c.id
            ${whereClause} 
            ORDER BY ${dbSort} ${safeOrder} 
            LIMIT ${safeLimit} OFFSET ${offset}
        `, params);
        products = dataRes.rows;
    } catch (error) {
        console.error("Inventory Page DB Error:", error);
    }

    const categories = await getCategories();
    // Fetch unique brands for the filter
    const brandRes = await db.query("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != '' ORDER BY brand ASC");
    const brands = brandRes.rows.map(r => r.brand);

    return (
        <div className="space-y-6">
            <Suspense fallback={<div className="h-40 bg-slate-100 animate-pulse rounded-lg"></div>}>
                <InventoryManager
                    initialProducts={products}
                    initialTotalCount={totalCount}
                    initialLimit={safeLimit}
                    currentPage={page}
                    categories={categories}
                    brands={brands}
                />
            </Suspense>
        </div>
    );
}
