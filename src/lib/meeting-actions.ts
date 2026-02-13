'use server';

import { getSession } from './auth';
import { db } from './db';
import { revalidatePath } from 'next/cache';

// --- Database Schema ---

async function ensureMeetingTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS meeting_logs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            date TEXT NOT NULL, -- YYYY-MM-DD HH:mm
            location TEXT,
            attendees TEXT, -- JSON array of strings (names or ids)
            content TEXT,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// --- Types ---

export interface Meeting {
    id: string;
    title: string;
    date: string;
    location: string;
    attendees: string[]; // parsed JSON
    content: string;
    created_by: string;
    created_at: string;
    creator_name?: string;
}

// --- Actions ---

export async function getMeetings(limit?: number) {
    const session = await getSession();
    if (!session) return [];

    await ensureMeetingTable();

    try {
        let query = `
            SELECT m.*, u.name as creator_name 
            FROM meeting_logs m
            LEFT JOIN users u ON m.created_by = u.id
            ORDER BY m.date DESC
        `;
        if (limit) {
            query += ` LIMIT ${limit}`;
        }

        const res = await db.query(query);
        return res.rows.map(row => ({
            ...row,
            attendees: JSON.parse(row.attendees || '[]')
        }));
    } catch (e) {
        console.error("getMeetings error:", e);
        return [];
    }
}

export async function getMeeting(id: string) {
    const session = await getSession();
    if (!session) return null;

    await ensureMeetingTable();

    try {
        const res = await db.query(`
            SELECT m.*, u.name as creator_name 
            FROM meeting_logs m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = $1
        `, [id]);

        if (!res.rows[0]) return null;

        return {
            ...res.rows[0],
            attendees: JSON.parse(res.rows[0].attendees || '[]')
        };
    } catch (e) {
        return null;
    }
}

export async function createMeeting(data: { title: string, date: string, location: string, attendees: string[], content: string }) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    await ensureMeetingTable();

    const id = Math.random().toString(36).substring(2, 12);

    try {
        await db.query(`
            INSERT INTO meeting_logs (id, title, date, location, attendees, content, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            id,
            data.title,
            data.date,
            data.location,
            JSON.stringify(data.attendees),
            data.content,
            session.id
        ]);

        revalidatePath('/business/collaboration/meetings');
        revalidatePath('/'); // Refresh dashboard widget
        return { success: true, id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMeeting(id: string, data: { title: string, date: string, location: string, attendees: string[], content: string }) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    try {
        await db.query(`
            UPDATE meeting_logs 
            SET title = $1, date = $2, location = $3, attendees = $4, content = $5
            WHERE id = $6
        `, [
            data.title,
            data.date,
            data.location,
            JSON.stringify(data.attendees),
            data.content,
            id
        ]);

        revalidatePath('/business/collaboration/meetings');
        revalidatePath(`/business/collaboration/meetings/${id}`);
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMeeting(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    try {
        await db.query('DELETE FROM meeting_logs WHERE id = $1', [id]);
        revalidatePath('/business/collaboration/meetings');
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
