import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const archive = searchParams.get('archive') || 'NEW';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category = c.id
      WHERE p.status = '판매중' AND p.archive = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [archive, limit, offset]);

        const countResult = await db.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE status = '판매중' AND archive = $1
    `, [archive]);

        return NextResponse.json({
            success: true,
            items: result.rows,
            total: parseInt(countResult.rows[0].count),
            page,
            limit
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
