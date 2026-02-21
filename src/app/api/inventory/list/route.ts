import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// 인벤토리 목록 API (CSR 전환용)
// manage/page.tsx의 서버사이드 쿼리를 API화
export async function GET(request: NextRequest) {
    try {
        await ensureDbInitialized();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const searchField = searchParams.get('field') || 'all';
        const excludeCode = searchParams.get('excludeCode') || '';
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';
        const updatedStart = searchParams.get('updatedStart') || '';
        const updatedEnd = searchParams.get('updatedEnd') || '';
        const statusParam = searchParams.get('status') || '';
        const categoriesParam = searchParams.get('category') || searchParams.get('categories') || '';
        const conditionsParam = searchParams.get('conditions') || '';
        const sizesParam = searchParams.get('sizes') || '';
        const smartstoreParam = searchParams.get('smartstore') || 'all';
        const aiParam = searchParams.get('ai') || '';
        const editParam = searchParams.get('edit') || '';

        // Pagination
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const safeLimit = isNaN(limit) ? 50 : Math.min(limit, 1000);
        const offset = (page - 1) * safeLimit;

        // Build SQL Conditions
        const sqlConditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        // Status Filter
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
                if (terms.length <= 100) {
                    const placeholders = terms.map(() => `$${paramIndex++}`);
                    sqlConditions.push(`p.id IN (${placeholders.join(', ')})`);
                    params.push(...terms);
                } else {
                    const sanitizedTerms = terms.map(t => `'${t.replace(/'/g, "''")}'`);
                    sqlConditions.push(`p.id IN (${sanitizedTerms.join(', ')})`);
                }
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

        // 스마트스토어 필터
        const naverJoin = 'LEFT JOIN naver_products np ON p.id = np.seller_management_code';
        if (smartstoreParam === 'unregistered') {
            sqlConditions.push('np.seller_management_code IS NULL');
        } else if (smartstoreParam === 'registered') {
            sqlConditions.push('np.seller_management_code IS NOT NULL');
        } else if (smartstoreParam === 'suspended') {
            sqlConditions.push("np.status_type = 'SUSPENSION'");
        } else if (smartstoreParam === 'outofstock') {
            sqlConditions.push("np.status_type = 'OUTOFSTOCK'");
        }

        // Updated At Date Range
        if (updatedStart) {
            sqlConditions.push(`p.updated_at >= $${paramIndex}`);
            params.push(`${updatedStart} 00:00:00`);
            paramIndex++;
        }
        if (updatedEnd) {
            sqlConditions.push(`p.updated_at <= $${paramIndex}`);
            params.push(`${updatedEnd} 23:59:59`);
            paramIndex++;
        }

        // AI 작업 필터
        if (aiParam === 'done') {
            sqlConditions.push(`p.ai_completed = 1`);
        } else if (aiParam === 'undone') {
            sqlConditions.push(`(p.ai_completed IS NULL OR p.ai_completed = 0)`);
        }

        // 수정완료 필터
        if (editParam === 'done') {
            sqlConditions.push(`p.edit_completed = 1`);
        } else if (editParam === 'undone') {
            sqlConditions.push(`(p.edit_completed IS NULL OR p.edit_completed = 0)`);
        }

        const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

        // 핵심 2개 쿼리만 실행 (brands/stats는 별도 API로 분리)
        const [countResult, dataResult] = await Promise.all([
            // 1. Count
            db.query(`
                SELECT COUNT(*) as count
                FROM products p
                LEFT JOIN categories c ON p.category = c.id
                ${naverJoin}
                ${whereClause}
            `, params),
            // 2. Data
            db.query(`
                SELECT p.*, c.name as category_name, c.classification as category_classification,
                       np.origin_product_no as smartstore_no, np.status_type as smartstore_status,
                       np.sale_price as smartstore_price,
                       sp.shoulder, sp.chest, sp.waist, sp.arm_length as sleeve,
                       sp.length1 as total_length, sp.hem, sp.rise, sp.thigh, sp.length2 as inseam,
                       sp.hip, sp.fabric1 as sp_fabric1, sp.fabric2 as sp_fabric2,
                       sp.image_urls as sp_image_urls, sp.label_image as sp_label_image
                FROM products p
                LEFT JOIN categories c ON p.category = c.id
                ${naverJoin}
                LEFT JOIN supplier_products sp ON p.id = sp.product_code
                ${whereClause}
                ORDER BY p.created_at DESC
                LIMIT ${safeLimit} OFFSET ${offset}
            `, params),
        ]);

        const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

        return NextResponse.json({
            products: dataResult.rows,
            totalCount,
            page,
            limit: safeLimit,
        }, {
            headers: {
                // 60초 캐시, 120초 stale-while-revalidate
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (error: any) {
        console.error('[Inventory List API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
