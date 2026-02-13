import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 });
        }

        // Batch execution
        for (const item of items) {
            const { id, overrideDate, internalCategory } = item;
            if (!id) continue;

            await db.query(`
                INSERT INTO product_overrides (id, override_date, internal_category, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET
                    override_date = COALESCE(EXCLUDED.override_date, product_overrides.override_date),
                    internal_category = COALESCE(EXCLUDED.internal_category, product_overrides.internal_category),
                    updated_at = CURRENT_TIMESTAMP
            `, [id, overrideDate || null, internalCategory || null]);
        }

        return NextResponse.json({ success: true, count: items.length });
    } catch (error: any) {
        console.error('Failed to classify product:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const res = await db.query('SELECT id, override_date, internal_category FROM product_overrides');
        const overrides: Record<string, any> = {};
        res.rows.forEach(row => {
            overrides[row.id] = {
                overrideDate: row.override_date,
                internalCategory: row.internal_category
            };
        });
        return NextResponse.json({ success: true, data: overrides });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
