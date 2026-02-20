import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { processUserCommand } from '@/lib/ai-command';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { command } = await req.json();

    try {
        const result = await processUserCommand(command, {
            id: session.id,
            name: session.name,
            role: session.role
        });

        return NextResponse.json({
            message: result.reply,
            type: result.type,
            actionData: result.actionData,
            intent: result.intent
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: '처리 중 오류가 발생했습니다.', type: 'error' });
    }
}
