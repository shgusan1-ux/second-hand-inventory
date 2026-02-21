import { NextRequest, NextResponse } from 'next/server';
import { debugToken, exchangeForLongLivedToken, getPages } from '@/lib/meta-api';

/**
 * POST /api/sns/meta/setup — 토큰 교환 + 페이지 정보 조회
 *
 * body: {
 *   action: 'debug-token' | 'exchange-token' | 'list-pages',
 *   token?: string,
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, token } = body as {
            action: string;
            token?: string;
        };

        switch (action) {
            case 'debug-token': {
                const info = await debugToken(token);
                return NextResponse.json(info);
            }

            case 'exchange-token': {
                if (!token) {
                    return NextResponse.json(
                        { error: 'Short-lived 토큰이 필요합니다' },
                        { status: 400 }
                    );
                }
                const result = await exchangeForLongLivedToken(token);
                if (result.error) {
                    return NextResponse.json({ error: result.error }, { status: 400 });
                }
                return NextResponse.json({
                    success: true,
                    accessToken: result.accessToken,
                    expiresIn: result.expiresIn,
                    expiresInDays: result.expiresIn ? Math.round(result.expiresIn / 86400) : null,
                });
            }

            case 'list-pages': {
                const pages = await getPages(token);
                return NextResponse.json({ pages });
            }

            default:
                return NextResponse.json(
                    { error: `알 수 없는 action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message || 'Meta API 설정 오류' },
            { status: 500 }
        );
    }
}
