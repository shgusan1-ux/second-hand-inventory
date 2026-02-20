import { db } from '@/lib/db';

interface NotificationInput {
    userId?: string | null;
    type: 'info' | 'warning' | 'error' | 'success' | 'deployment';
    title: string;
    message: string;
    linkUrl?: string;
    expiresInMinutes?: number;
}

export async function createNotification(data: NotificationInput) {
    let expiresAt = null;
    if (data.expiresInMinutes) {
        expiresAt = new Date(Date.now() + data.expiresInMinutes * 60000).toISOString();
    }

    await db.query(`
    INSERT INTO notifications (user_id, type, title, message, link_url, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [data.userId || null, data.type, data.title, data.message, data.linkUrl || null, expiresAt]);
}

export async function getActiveNotifications(userId: string) {
    // Get system-wide (user_id IS NULL) + user specific notifications
    // Not expired
    const res = await db.query(`
    SELECT * FROM notifications 
    WHERE (user_id = $1 OR user_id IS NULL)
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND is_read = FALSE
    ORDER BY created_at DESC
  `, [userId]);
    return res.rows;
}

export async function markAsRead(id: number, userId: string) {
    await db.query(`
    UPDATE notifications 
    SET is_read = TRUE 
    WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
  `, [id, userId]);
}
