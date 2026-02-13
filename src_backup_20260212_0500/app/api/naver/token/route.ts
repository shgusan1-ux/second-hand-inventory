import { NextResponse } from 'next/server';
import { getNaverToken } from '@/lib/naver-api-client';

/**
 * API Route to manually trigger or test Naver Token generation
 * POST /api/naver/token
 */
export async function POST() {
    try {
        const clientId = process.env.NAVER_CLIENT_ID;
        const clientSecret = process.env.NAVER_CLIENT_SECRET;

        if (!clientId || !clientSecret || clientId === 'placeholder') {
            return NextResponse.json({
                success: false,
                error: 'Naver credentials are not configured in environment variables.'
            }, { status: 400 });
        }

        // Call the proxy-based token generation
        const tokenData = await getNaverToken();

        return NextResponse.json({
            success: true,
            data: tokenData
        });
    } catch (error: any) {
        console.error('Naver Token API Route Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
