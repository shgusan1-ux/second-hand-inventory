'use server';

import { db } from './db';
import { getSession, logAction } from './auth';
import { revalidatePath } from 'next/cache';

export type FeedbackType = 'BUG' | 'FEATURE' | 'IMPROVEMENT';
export type FeedbackStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export async function submitFeedback(type: FeedbackType, title: string, content: string, imageUrl?: string, consoleLogs?: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    const id = Math.random().toString(36).substring(2, 12);

    try {
        await db.query(`
            INSERT INTO app_feedback (id, user_id, user_name, type, title, content, status, image_url, console_logs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [id, session.id, session.name, type, title, content, 'PENDING', imageUrl || null, consoleLogs || null]);

        await logAction('SUBMIT_FEEDBACK', 'app_feedback', id, `New feedback: ${title}`);
        revalidatePath('/admin/feedback');
        return { success: true };
    } catch (e: any) {
        console.error('[FEEDBACK_ACTION] Submit failed:', e);
        return { success: false, error: `Submit failed: ${e.message}` };
    }
}

export async function getFeedbacks() {
    try {
        const res = await db.query('SELECT * FROM app_feedback ORDER BY created_at DESC');
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        // Fallback check: represent Admin if job_title is one of the administrative ones
        if (!['대표자', '경영지원', '점장'].includes(session?.job_title || '')) {
            return { success: false, error: 'Unauthorized' };
        }
    }

    try {
        await db.query('UPDATE app_feedback SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
        await logAction('UPDATE_FEEDBACK_STATUS', 'app_feedback', id, `Status updated to ${status}`);
        revalidatePath('/admin/feedback');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateAdminComment(id: string, comment: string) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원', '점장'].includes(session?.job_title || '')) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await db.query('UPDATE app_feedback SET admin_comment = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [comment, id]);
        await logAction('UPDATE_FEEDBACK_COMMENT', 'app_feedback', id, `Comment added`);
        revalidatePath('/admin/feedback');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
