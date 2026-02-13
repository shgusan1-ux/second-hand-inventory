import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { ids, archive, lock = false } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, error: 'No IDs provided' }, { status: 400 });
        }

        await db.query(`
      UPDATE products 
      SET archive = $1, archive_locked = $2 
      WHERE id = ANY($3)
    `, [archive, lock, ids]);

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
