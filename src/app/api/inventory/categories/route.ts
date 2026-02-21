import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/data';

export async function GET() {
    try {
        const categories = await getCategories();
        return NextResponse.json({ success: true, data: categories }, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error: any) {
        console.error('[Categories API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
