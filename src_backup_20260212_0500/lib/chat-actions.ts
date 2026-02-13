'use server';

import { db } from './db';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function heartbeat() {
    const session = await getSession();
    if (!session || !session.id) return;

    try {
        await db.query(`
            INSERT INTO user_presence (user_id, last_active_at, name, job_title)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
            ON CONFLICT (user_id) 
            DO UPDATE SET last_active_at = CURRENT_TIMESTAMP, name = $2, job_title = $3
        `, [session.id, session.name, session.job_title]);

    } catch (e) {
        console.error('Heartbeat failed:', e);
    }
}

export async function getOnlineUsers() {
    try {
        // Active in last 5 minutes (SQLite compatible)
        const res = await db.query(`
            SELECT * FROM user_presence
            WHERE last_active_at > datetime('now', '-5 minutes')
            ORDER BY last_active_at DESC
        `);
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function getMessages() {
    try {
        const res = await db.query(`
            SELECT * FROM chat_messages 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        return res.rows.reverse(); // Newest last
    } catch (e) {
        return [];
    }
}

export async function sendMessage(content: string, attachment: string | null = null) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    if (!content.trim() && !attachment) return { success: false };

    try {
        await db.query(`
            INSERT INTO chat_messages (sender_id, sender_name, content, attachment)
            VALUES ($1, $2, $3, $4)
        `, [session.id, session.name, content, attachment]);

        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Failed' };
    }
}
