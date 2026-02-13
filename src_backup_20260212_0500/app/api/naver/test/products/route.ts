import { NextResponse } from 'next/server';
import { getNaverProducts } from '@/lib/naver/apis/products';

export async function GET() {
    try {
        const data = await getNaverProducts({ size: 1 });
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
