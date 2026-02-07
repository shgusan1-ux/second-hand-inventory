import { db } from '@/lib/db';
import { InventoryManager } from '@/components/inventory/inventory-manager';
import { getCategories } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function InventoryManagePage({
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

    // Search Query (Fallback to GET for small queries or direct URL access)
    // Bulk search via API relies on client-side state, so this only handles URL param 'q'
    if (query) {
        const terms = query.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

        if (terms.length > 1) {
            // Bulk Search Strategy
            if (terms.length <= 100) {
                // Small batch: Use Safe Parameter Binding
                const placeholders = terms.map(() => `$${paramIndex++}`);
                sqlConditions.push(`id IN (${placeholders.join(', ')})`);
                params.push(...terms);
            } else {
                // Large batch (100+): Use Sanitized Literals
                const sanitizedTerms = terms.map(t => `'${t.replace(/'/g, "''")}'`);
                sqlConditions.push(`id IN (${sanitizedTerms.join(', ')})`);
            }
        } else {
            // Single Search Logic
            if (searchField === 'name') {
                sqlConditions.push(`name LIKE $${paramIndex}`);
            } else if (searchField === 'id') {
                sqlConditions.push(`id LIKE $${paramIndex}`);
            } else if (searchField === 'brand') {
                sqlConditions.push(`brand LIKE $${paramIndex}`);
            } else {
                sqlConditions.push(`(name LIKE $${paramIndex} OR id LIKE $${paramIndex} OR brand LIKE $${paramIndex})`);
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

    // 1. Fetch Total Count
    let result;
    let totalCount = 0;
    let products = [];

    try {
        const countSql = `SELECT COUNT(*) as count FROM products ${whereClause}`;
        const countResult = await db.query(countSql, params);
        totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

        // 2. Fetch Data
        const dataSql = `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`;
        result = await db.query(dataSql, params);
        products = result.rows;
    } catch (error) {
        console.error("Inventory Page DB Error:", error);
        products = [];
        totalCount = 0;
    }

    const categories = await getCategories();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">재고 관리 (수정)</h1>
                <p className="text-sm font-medium text-slate-500">상품 정보를 수정하거나 관리할 수 있는 페이지입니다.</p>
            </div>

            <InventoryManager
                initialProducts={products}
                initialTotalCount={totalCount}
                initialLimit={safeLimit}
                currentPage={page}
                categories={categories}
            />
        </div>
    );
}
