import { NextResponse } from 'next/server';
import { processUserCommand } from '@/lib/ai-command';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('Kakao Request:', JSON.stringify(body, null, 2));

        // Kakao i Open Builder Payload Structure
        // { userRequest: { user: { id: '...' }, utterance: '...' } }
        const userRequest = body.userRequest;

        // Safety check
        if (!userRequest) {
            return NextResponse.json({
                version: "2.0",
                template: { outputs: [{ simpleText: { text: "요청 형식이 올바르지 않습니다." } }] }
            });
        }

        const kakaoUserId = userRequest.user?.id || 'unknown';
        const commandText = userRequest.utterance || '';

        // 카카오 외부 사용자는 읽기 전용 (viewer) 권한만 부여
        const userInfo = {
            id: `kakao-${kakaoUserId}`,
            name: 'Kakao User',
            role: 'viewer'
        };

        const result = await processUserCommand(commandText, userInfo);

        // Format response for Kakao (Simple Text & Quick Replies if needed)
        const responseBody = {
            version: "2.0",
            template: {
                outputs: [
                    {
                        simpleText: {
                            text: result.reply
                        }
                    }
                ]
            }
        };

        return NextResponse.json(responseBody);

    } catch (error) {
        console.error('Kakao Webhook Error:', error);
        // Return a valid JSON even on error so the bot doesn't freeze
        return NextResponse.json({
            version: "2.0",
            template: {
                outputs: [
                    {
                        simpleText: {
                            text: "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
                        }
                    }
                ]
            }
        });
    }
}
