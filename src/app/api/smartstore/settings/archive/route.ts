import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDbInitialized } from '@/lib/db-init';

export async function GET() {
    try {
        await ensureDbInitialized();
        const { rows } = await db.query('SELECT * FROM archive_category_settings ORDER BY sort_order ASC');
        return NextResponse.json({ success: true, settings: rows });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { category_id, display_name, sort_order } = body;

        if (!category_id || !display_name) {
            return NextResponse.json({ success: false, error: 'category_id and display_name are required' }, { status: 400 });
        }

        await db.query(`
      UPDATE archive_category_settings 
      SET display_name = $1, sort_order = $2
      WHERE category_id = $3
    `, [display_name, sort_order || 0, category_id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await ensureDbInitialized();
        const body = await request.json();
        const { category_id, display_name, sort_order } = body;

        if (!category_id || !display_name) {
            return NextResponse.json({ success: false, error: 'category_id and display_name are required' }, { status: 400 });
        }

        await db.query(`
          INSERT INTO archive_category_settings (category_id, display_name, sort_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (category_id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            sort_order = EXCLUDED.sort_order
        `, [category_id, display_name, sort_order || 0]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
