'use server';

import { db } from './db';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function createBugReport(data: {
    content: string;
    pageUrl: string;
    userAgent: string;
    consoleLogs: string;
}) {
    const session = await getSession();
    const userId = session?.id || 'anonymous';
    const userName = session?.name || 'Unknown';

    try {
        const id = Math.random().toString(36).substring(2, 9);
        await db.query(
            `INSERT INTO bug_reports (id, user_id, user_name, page_url, user_agent, content, console_logs)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, userId, userName, data.pageUrl, data.userAgent, data.content, data.consoleLogs]
        );

        // Also add to dashboard tasks (patch log) if it's high priority or just to notify?
        // For now, let's keep it in its own table.

        revalidatePath('/admin/bugs');
        return { success: true };
    } catch (e) {
        console.error('Bug report creation failed:', e);
        return { success: false, error: '버그 신고에 실패했습니다.' };
    }
}

export async function getBugReports() {
    try {
        const res = await db.query(`SELECT * FROM bug_reports ORDER BY created_at DESC`);
        return res.rows;
    } catch (e) {
        console.error('Fetch bug reports failed:', e);
        return [];
    }
}

export async function updateBugStatus(id: string, status: string) {
    try {
        await db.query(`UPDATE bug_reports SET status = $1 WHERE id = $2`, [status, id]);
        revalidatePath('/admin/bugs');
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}
