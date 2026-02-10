import { NextResponse } from 'next/server';
import { getNaverToken } from '@/lib/naver-api-client';

export async function POST() {
    console.log('[API/Token] Naver Token 발급 요청 시작...');
    try {
        const token = await getNaverToken();
        console.log('[API/Token] Naver Token 발급 성공:', {
            access_token: token.access_token.substring(0, 10) + '...',
            expires_in: token.expires_in
        });
        return NextResponse.json({ success: true, token });
    } catch (error: any) {
        console.error('[API/Token] Naver Token 발급 실패:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            hint: 'NAVER_CLIENT_ID / SECRET 및 프록시 설정을 확인하세요.'
        }, { status: 500 });
    }
}
