import { NextResponse } from 'next/server';
import { getNaverOrders } from '@/lib/naver/apis/orders';

export async function GET() {
    try {
        const data = await getNaverOrders();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
