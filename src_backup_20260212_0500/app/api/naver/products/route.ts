import { NextResponse } from 'next/server';
import { getNaverToken, callNaverAPI } from '@/lib/naver-api-client';

export async function GET() {
    try {
        const clientId = process.env.NAVER_CLIENT_ID;
        const clientSecret = process.env.NAVER_CLIENT_SECRET;

        if (!clientId || !clientSecret || clientId === 'placeholder') {
            return NextResponse.json({ success: false, error: 'Naver credentials not configured' }, { status: 400 });
        }

        // 1. Get Token
        const tokenRes = await getNaverToken();

        // 2. Call Whole Products API
        const products = await callNaverAPI('/v1/products/whole-products', {
            token: tokenRes.access_token,
            method: 'GET'
        });

        return NextResponse.json({
            success: true,
            data: products
        });
    } catch (error: any) {
        console.error('Naver Products API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
