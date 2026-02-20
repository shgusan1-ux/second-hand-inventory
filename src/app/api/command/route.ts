import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { processUserCommand } from '@/lib/ai-command';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    try {
        if (sessionId) {
            const { rows: messages } = await db.query(
                'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
                [sessionId]
            );
            return NextResponse.json({ messages });
        } else {
            const { rows: sessions } = await db.query(
                'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20',
                [session.id]
            );
            return NextResponse.json({ sessions });
        }
    } catch (error) {
        console.error('Chat history fetch error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { command, model, sessionId: incomingSessionId } = await req.json();
        const sessionId = incomingSessionId || crypto.randomUUID();

        // 1. Ensure Session Exists
        const { rows: existingSession } = await db.query('SELECT 1 FROM chat_sessions WHERE id = ?', [sessionId]);
        if (existingSession.length === 0) {
            await db.query(
                'INSERT INTO chat_sessions (id, title, user_id) VALUES (?, ?, ?)',
                [sessionId, command.substring(0, 30) + (command.length > 30 ? '...' : ''), session.id]
            );
        } else {
            await db.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
        }

        // 2. Save User Message
        const userMsgId = crypto.randomUUID();
        await db.query(
            'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
            [userMsgId, sessionId, 'user', command]
        );

        // 3. Process Command
        const result = await processUserCommand(command, {
            id: session.id,
            name: session.name,
            role: session.role
        }, model);

        // 4. Save Assistant Response
        const aiMsgId = crypto.randomUUID();
        await db.query(
            'INSERT INTO chat_messages (id, session_id, role, content, type, action_data) VALUES (?, ?, ?, ?, ?, ?)',
            [aiMsgId, sessionId, 'assistant', result.reply, result.type, JSON.stringify(result.actionData)]
        );

        return NextResponse.json({
            message: result.reply,
            type: result.type,
            actionData: result.actionData,
            intent: result.intent,
            sessionId: sessionId
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: '처리 중 오류가 발생했습니다.', type: 'error' });
    }
}
