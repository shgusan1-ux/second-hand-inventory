'use server';

import { db } from './db';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function heartbeat() {
    const session = await getSession();
    if (!session || !session.id) return;

    try {
        // Ensure column exists (Lazy migration)
        // We will try to create table with attachment column
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                sender_id TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                content TEXT NOT NULL,
                attachment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // If table existed before without attachment, we try to add it.
        // This query might fail if column exists or on some DBs, so we wrap in try-catch or ignore.
        try {
            await db.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment TEXT`);
        } catch (e) {
            // Ignore error if column already exists
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS user_presence (
                user_id TEXT PRIMARY KEY,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                name TEXT,
                job_title TEXT
            )
        `);

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
        // Active in last 5 minutes
        const res = await db.query(`
            SELECT * FROM user_presence 
            WHERE last_active_at > NOW() - INTERVAL '5 minutes'
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
