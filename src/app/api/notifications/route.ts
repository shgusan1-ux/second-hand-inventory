import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { rows } = await db.query(`
      SELECT * FROM notifications 
      WHERE (user_id = $1 OR user_id IS NULL)
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 10
    `, [session.id]);

        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.query(`
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
  `, [id, session.id]);

    return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
    // Admin only: Creating manual notifications (or System API call)
    const session = await getSession();
    if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { type, title, message, linkUrl, expiresInMinutes } = await req.json();

    const expiresAt = expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000).toISOString() : null;

    await db.query(`
    INSERT INTO notifications (user_id, type, title, message, link_url, expires_at)
    VALUES (NULL, $1, $2, $3, $4, $5)
  `, [type || 'info', title, message, linkUrl, expiresAt]);

    return NextResponse.json({ success: true });
}
