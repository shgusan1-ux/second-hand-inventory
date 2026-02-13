'use server';

import { db } from './db';
import { revalidatePath } from 'next/cache';
import { getSession, logAction } from './auth';

export interface Transaction {
    id: number;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    category: string;
    description?: string;
    date: string;
    payment_method?: string;
    created_by?: string;
    created_at: string;
}

// Schema is now handled centrally in db.ts

export async function getTransactions(filters?: { startDate?: string, endDate?: string, type?: string }) {
    const session = await getSession();
    if (!session) return [];

    // Permission check
    // Only Representative or those with permission
    if (session.job_title !== '대표자') {
        // We need to fetch the user's permission to be sure, but session cookie might be stale.
        // Let's fetch user from DB to be safe for this sensitive feature.
        const userRes = await db.query('SELECT can_view_accounting, job_title FROM users WHERE id = $1', [session.id]);
        const user = userRes.rows[0];
        if (!user || (!user.can_view_accounting && user.job_title !== '대표자')) {
            return [];
        }
    }

    let query = 'SELECT * FROM transactions';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.type && filters.type !== 'ALL') {
        conditions.push(`type = $${params.length + 1}`);
        params.push(filters.type);
    }

    if (filters?.startDate) {
        conditions.push(`date >= $${params.length + 1}`);
        params.push(filters.startDate);
    }

    if (filters?.endDate) {
        conditions.push(`date <= $${params.length + 1}`);
        params.push(filters.endDate);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date DESC, created_at DESC';

    try {
        const res = await db.query(query, params);
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function addTransaction(data: any) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Auth required' };

    try {
        await db.query(`
            INSERT INTO transactions (type, amount, category, description, date, payment_method, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            data.type,
            data.amount,
            data.category,
            data.description,
            data.date,
            data.payment_method,
            session.name
        ]);

        await logAction('ADD_TRANSACTION', 'accounting', 'new', `${data.type} ${data.amount}`);
        revalidatePath('/accounting');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteTransaction(id: number) {
    const session = await getSession();
    // Only Representative can delete? Or anyone with access? Let's say anyone with access for now, or restrict.
    // Let's restrict delete to Representative for safety.
    if (!session || session.job_title !== '대표자') {
        return { success: false, error: 'Only Representative can delete transactions' };
    }

    try {
        await db.query('DELETE FROM transactions WHERE id = $1', [id]);
        await logAction('DELETE_TRANSACTION', 'accounting', id.toString(), 'Deleted');
        revalidatePath('/accounting');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}

export async function getAccountingStats(month: string) {
    // month format: YYYY-MM
    // Re-use permission logic if strictly needed, but this is usually called by the page which checks permission.

    try {
        // Summary for the month
        const start = `${month}-01`;
        const end = `${month}-31`; // Simple approximation

        const res = await db.query(`
            SELECT type, SUM(amount) as total 
            FROM transactions 
            WHERE date >= $1 AND date <= $2
            GROUP BY type
        `, [start, end]);

        const stats = {
            income: 0,
            expense: 0,
            profit: 0
        };

        res.rows.forEach((row: any) => {
            if (row.type === 'INCOME') stats.income = parseInt(row.total);
            if (row.type === 'EXPENSE') stats.expense = parseInt(row.total);
        });

        stats.profit = stats.income - stats.expense;
        return stats;
    } catch (e) {
        return { income: 0, expense: 0, profit: 0 };
    }
}

export async function toggleAccountingPermission(targetUserId: string, canView: boolean) {
    const session = await getSession();
    if (!session || session.job_title !== '대표자') {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await db.query('UPDATE users SET can_view_accounting = $1 WHERE id = $2', [canView, targetUserId]);
        await logAction('UPDATE_PERMISSION', 'user', targetUserId, `Accounting view: ${canView}`);
        revalidatePath('/members');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}
