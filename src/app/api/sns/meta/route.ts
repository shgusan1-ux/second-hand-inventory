import { NextRequest, NextResponse } from 'next/server';
import {
    getAccountStatus,
    postToFacebook,
    postToInstagram,
    postToInstagramStory,
} from '@/lib/meta-api';
import { db } from '@/lib/db';

export const maxDuration = 60;

/**
 * GET /api/sns/meta — Meta 연결 상태 확인
 */
export async function GET() {
    try {
        const status = await getAccountStatus();
        return NextResponse.json(status);
    } catch (err: any) {
        return NextResponse.json(
            { connected: false, tokenValid: false, error: err.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/sns/meta — Facebook/Instagram에 콘텐츠 게시
 *
 * body: {
 *   platform: 'facebook' | 'instagram-feed' | 'instagram-story',
 *   message: string,
 *   imageUrl?: string,
 *   link?: string,
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { platform, message, imageUrl, link } = body as {
            platform: string;
            message: string;
            imageUrl?: string;
            link?: string;
        };

        if (!platform || !message) {
            return NextResponse.json(
                { error: '플랫폼과 메시지가 필요합니다' },
                { status: 400 }
            );
        }

        let result;

        switch (platform) {
            case 'facebook': {
                result = await postToFacebook({ message, imageUrl, link });
                break;
            }
            case 'instagram-feed': {
                if (!imageUrl) {
                    return NextResponse.json(
                        { error: 'Instagram 피드 게시에는 이미지가 필요합니다' },
                        { status: 400 }
                    );
                }
                result = await postToInstagram({ imageUrl, caption: message });
                break;
            }
            case 'instagram-story': {
                if (!imageUrl) {
                    return NextResponse.json(
                        { error: 'Instagram 스토리 게시에는 이미지가 필요합니다' },
                        { status: 400 }
                    );
                }
                result = await postToInstagramStory({ imageUrl });
                break;
            }
            default:
                return NextResponse.json(
                    { error: `지원하지 않는 플랫폼: ${platform}` },
                    { status: 400 }
                );
        }

        // 게시 이력 저장
        if (result.success) {
            try {
                await db.query(
                    `INSERT INTO sns_posts (id, platform, post_id, post_url, message, image_url, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                    [
                        crypto.randomUUID(),
                        platform,
                        result.postId || '',
                        result.postUrl || '',
                        message.slice(0, 500),
                        imageUrl || '',
                    ]
                );
            } catch (dbErr) {
                console.warn('[SNS Meta] 게시 이력 저장 실패 (무시):', dbErr);
            }
        }

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            postId: result.postId,
            postUrl: result.postUrl,
        });
    } catch (err: any) {
        console.error('[SNS Meta API] Error:', err);
        return NextResponse.json(
            { error: err.message || 'Meta API 게시 실패' },
            { status: 500 }
        );
    }
}
