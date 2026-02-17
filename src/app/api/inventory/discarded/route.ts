import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = await db.query(`
            SELECT * FROM products 
            WHERE status = '폐기' 
            ORDER BY created_at DESC
        `);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Fetch discarded API error:', error);
        return NextResponse.json({ error: 'Failed to fetch discarded products' }, { status: 500 });
    }
}
