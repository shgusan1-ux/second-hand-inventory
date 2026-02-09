import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, overrideDate, internalCategory } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing product ID' }, { status: 400 });
        }

        // Lazy create table if not exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_overrides (
                id TEXT PRIMARY KEY,
                override_date TIMESTAMP,
                internal_category TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Update or insert override
        await db.query(`
            INSERT INTO product_overrides (id, override_date, internal_category, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                override_date = EXCLUDED.override_date,
                internal_category = EXCLUDED.internal_category,
                updated_at = CURRENT_TIMESTAMP
        `, [id, overrideDate || null, internalCategory || null]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to classify product:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const res = await db.query('SELECT * FROM product_overrides');
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
