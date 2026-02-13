'use server';

import { db } from './db';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';

export async function getPasswords() {
    const session = await getSession();
    // Security check: Only authenticated users
    if (!session || !session.id) return [];

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS password_accounts (
                id SERIAL PRIMARY KEY,
                site_name TEXT NOT NULL,
                site_url TEXT,
                account_id TEXT NOT NULL,
                account_password TEXT NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by TEXT
            )
        `);

        // Check if empty, seed some data
        const countRes = await db.query('SELECT COUNT(*) FROM password_accounts');
        if (parseInt(countRes.rows[0].count) === 0) {
            await db.query(`
                INSERT INTO password_accounts (site_name, site_url, account_id, account_password, description, updated_by)
                VALUES 
                ('네이버 스마트스토어', 'https://sell.smartstore.naver.com', 'brownstreet_official', 'Brown!2024$$', '메인 스토어', 'System'),
                ('쿠팡 윙', 'https://wing.coupang.com', 'brown_manager', 'Coupang#9988', '로켓배송 관리', 'System')
            `);
        }

        const res = await db.query('SELECT * FROM password_accounts ORDER BY id ASC');
        return res.rows;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function addPassword(data: any) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        await db.query(`
            INSERT INTO password_accounts (site_name, site_url, account_id, account_password, description, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [data.site, data.url, data.id_val, data.pw, data.desc, session.name]);

        // Log to security_logs
        await db.query(`
           INSERT INTO security_logs (user_id, user_name, action, details)
           VALUES ($1, $2, 'ADD_SHARED_ACCOUNT', $3)
        `, [session.id, session.name, `Added account via Security Center: ${data.site}`]);

        revalidatePath('/security');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}

export async function updatePassword(id: number, data: any) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        await db.query(`
            UPDATE password_accounts 
            SET site_name=$1, site_url=$2, account_id=$3, account_password=$4, description=$5, updated_by=$6, updated_at=CURRENT_TIMESTAMP
            WHERE id=$7
        `, [data.site, data.url, data.id_val, data.pw, data.desc, session.name, id]);

        // Log to security_logs
        await db.query(`
           INSERT INTO security_logs (user_id, user_name, action, details)
           VALUES ($1, $2, 'UPDATE_SHARED_ACCOUNT', $3)
        `, [session.id, session.name, `Updated account: ${data.site} (ID: ${id})`]);

        revalidatePath('/security');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}

export async function deletePassword(id: number) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        // Fetch name before delete for logging
        const check = await db.query('SELECT site_name FROM password_accounts WHERE id=$1', [id]);
        const siteName = check.rows[0]?.site_name || 'Unknown';

        await db.query('DELETE FROM password_accounts WHERE id = $1', [id]);

        // Log to security_logs
        await db.query(`
           INSERT INTO security_logs (user_id, user_name, action, details)
           VALUES ($1, $2, 'DELETE_SHARED_ACCOUNT', $3)
        `, [session.id, session.name, `Deleted account: ${siteName} (ID: ${id})`]);

        revalidatePath('/security');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}
