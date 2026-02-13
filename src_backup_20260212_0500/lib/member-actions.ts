'use server';

import { db } from './db';
import { getSession, logAction } from './auth';
import { revalidatePath } from 'next/cache';

async function ensureTables() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_permissions (
                user_id TEXT,
                category TEXT,
                PRIMARY KEY (user_id, category)
            )
        `);
        // SQLite uses TEXT for dates usually
        await db.query(`
            CREATE TABLE IF NOT EXISTS attendance_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                work_date TEXT,
                check_in TEXT,
                check_out TEXT
            )
        `);
    } catch (e) {
        console.error("Member tables init error:", e);
    }
}

// --- Permissions ---

export async function getUserPermissions(userId: string) {
    await ensureTables();
    try {
        // Super Admin Bypass
        const userRes = await db.query('SELECT job_title FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (user && ['대표자', '경영지원'].includes(user.job_title)) {
            return ['ALL'];
        }

        const res = await db.query('SELECT category FROM user_permissions WHERE user_id = $1', [userId]);
        return res.rows.map((r: any) => r.category);
    } catch (e) {
        return [];
    }
}

export async function updateUserPermissions(targetUserId: string, categories: string[]) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    await ensureTables();

    try {
        // Clear existing
        await db.query('DELETE FROM user_permissions WHERE user_id = $1', [targetUserId]);

        // Insert new
        for (const cat of categories) {
            await db.query('INSERT INTO user_permissions (user_id, category) VALUES ($1, $2)', [targetUserId, cat]);
        }

        await logAction('UPDATE_PERMISSIONS', 'user', targetUserId, `Updated permissions: ${categories.join(', ')}`);
        revalidatePath('/members');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to update permissions' };
    }
}

// --- Attendance ---

function getKSTDate() {
    // Returns YYYY-MM-DD in KST
    const date = new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const kstGap = 9 * 60 * 60 * 1000;
    const kstDate = new Date(utc + kstGap);
    return kstDate.toISOString().split('T')[0];
}

function getKSTISO() {
    const date = new Date();
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const kstGap = 9 * 60 * 60 * 1000;
    return new Date(utc + kstGap).toISOString();
}

export async function getTodayAttendance(userId: string) {
    await ensureTables();
    const dateStr = getKSTDate();
    try {
        const res = await db.query('SELECT * FROM attendance_logs WHERE user_id = $1 AND work_date = $2', [userId, dateStr]);
        return res.rows[0] || null;
    } catch (e) {
        return null;
    }
}

export async function checkIn() {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    await ensureTables();
    const dateStr = getKSTDate();
    const now = getKSTISO();

    // Check if exists
    const existing = await getTodayAttendance(session.id);
    if (existing) return { success: false, error: 'Already checked in' };

    const id = Math.random().toString(36).substring(2, 12);
    try {
        await db.query(`
            INSERT INTO attendance_logs (id, user_id, work_date, check_in)
            VALUES ($1, $2, $3, $4)
        `, [id, session.id, dateStr, now]);

        await logAction('CHECK_IN', 'attendance', id, 'Started work');
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Check-in failed' };
    }
}

export async function checkOut() {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    const dateStr = getKSTDate();
    const now = getKSTISO();

    try {
        await db.query(`
            UPDATE attendance_logs 
            SET check_out = $1 
            WHERE user_id = $2 AND work_date = $3
        `, [now, session.id, dateStr]);

        await logAction('CHECK_OUT', 'attendance', session.id, 'Ended work');
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Check-out failed' };
    }
}

export async function getMemberAttendanceStats(userId: string, month: string) { // month YYYY-MM
    // Simple query
    const start = `${month}-01`;
    const end = `${month}-31`;
    try {
        const res = await db.query(`
            SELECT * FROM attendance_logs 
            WHERE user_id = $1 AND work_date >= $2 AND work_date <= $3
            ORDER BY work_date ASC
        `, [userId, start, end]);
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function updateUserJobTitle(targetUserId: string, newJobTitle: string) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    try {
        await db.query('UPDATE users SET job_title = $1 WHERE id = $2', [newJobTitle, targetUserId]);
        await logAction('UPDATE_JOB_TITLE', 'user', targetUserId, `Updated job title to ${newJobTitle}`);
        revalidatePath('/members');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to update job title' };
    }
}
