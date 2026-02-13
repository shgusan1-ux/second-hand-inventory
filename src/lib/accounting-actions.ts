'use server';

import { db } from './db';
import { getSession, logAction } from './auth';
import { ensureDbInitialized } from './db-init';
import { revalidatePath } from 'next/cache';

// Types for UI
export interface Transaction {
    id: string;
    date: string;
    type: 'INCOME' | 'EXPENSE' | 'IN' | 'OUT';
    amount: number;
    category: string;
    description: string;
    payment_method?: string;
    created_by?: string;
    account_id?: string;
    account_name?: string;
}

// Mock Account Data for Initial Setup
const MOCK_ACCOUNTS = [
    { id: 'acc_sc_yudong', name: '유동더센트리즈 (메인)', bank_name: 'SC제일은행', account_no: '123-456-7890', owner_entity: 'Yudong', balance: 15200000 },
    { id: 'acc_nh_pume', name: '품에안은 (운영)', bank_name: '농협', account_no: '333-0001-222', owner_entity: 'Pumeone', balance: 3450000 },
    { id: 'acc_kb_33m2', name: '삼삼엠투 (모임)', bank_name: 'KB국민은행', account_no: '999-88-777', owner_entity: '33m2', balance: 890000 },
    { id: 'acc_hm_1', name: '에이치엠 (계좌1)', bank_name: 'IBK기업은행', account_no: '111-22-3333', owner_entity: 'HM', balance: 500000 },
    { id: 'acc_hm_2', name: '에이치엠 (계좌2)', bank_name: 'IBK기업은행', account_no: '111-22-4444', owner_entity: 'HM', balance: 2000000 },
];

export async function syncBankAccounts() {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    await ensureDbInitialized();

    try {
        for (const acc of MOCK_ACCOUNTS) {
            await db.query(`
                INSERT INTO bank_accounts (id, name, bank_name, account_no, balance, owner_entity, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    balance = EXCLUDED.balance,
                    updated_at = CURRENT_TIMESTAMP
            `, [acc.id, acc.name, acc.bank_name, acc.account_no, acc.balance, acc.owner_entity]);
        }

        const MOCK_FIXED_COSTS = [
            { name: '인터넷/통신비', amount: 55000, due_day: 5, category: 'Utility', acc: 'acc_sc_yudong' },
            { name: '전기요금', amount: 120000, due_day: 15, category: 'Utility', acc: 'acc_sc_yudong' },
            { name: '가스요금', amount: 89000, due_day: 20, category: 'Utility', acc: 'acc_sc_yudong' },
            { name: '사무실 임대료', amount: 2500000, due_day: 25, category: 'Rent', acc: 'acc_hm_2' },
            { name: '임대료 수입 (유동)', amount: 1500000, due_day: 1, category: 'Rent', acc: 'acc_sc_yudong' },
        ];

        for (const cost of MOCK_FIXED_COSTS) {
            const id = 'fixed_' + Math.random().toString(36).substring(2, 8);
            await db.query(`
                INSERT INTO fixed_costs (id, name, amount, due_day, category, account_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
            `, [id, cost.name, cost.amount, cost.due_day, cost.category, cost.acc]);
        }

        await logAction('SYNC_BANK', 'accounting', 'all', '계좌 및 고정비 동기화 완료');
        revalidatePath('/business/accounts');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getBankAccounts() {
    await ensureDbInitialized();
    try {
        const res = await db.query('SELECT * FROM bank_accounts ORDER BY owner_entity DESC, name ASC');
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function getFixedCosts() {
    await ensureDbInitialized();
    try {
        const res = await db.query('SELECT * FROM fixed_costs ORDER BY due_day ASC');
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function getTransactions(options: { accountId?: string, startDate?: string, endDate?: string, limit?: number } = {}) {
    await ensureDbInitialized();
    try {
        let query = `
            SELECT t.*, a.name as account_name, t.transaction_date as date 
            FROM account_transactions t 
            LEFT JOIN bank_accounts a ON t.account_id = a.id
        `;
        let params: any[] = [];
        let whereClauses: string[] = [];

        if (options.accountId) {
            whereClauses.push(`t.account_id = $${params.length + 1}`);
            params.push(options.accountId);
        }

        if (options.startDate) {
            whereClauses.push(`t.transaction_date >= $${params.length + 1}`);
            params.push(options.startDate);
        }

        if (options.endDate) {
            whereClauses.push(`t.transaction_date <= $${params.length + 1}`);
            params.push(options.endDate);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` ORDER BY t.transaction_date DESC`;

        if (options.limit) {
            query += ` LIMIT $${params.length + 1}`;
            params.push(options.limit);
        }

        const res = await db.query(query, params);
        return res.rows.map(row => ({
            ...row,
            date: row.transaction_date.toISOString().split('T')[0],
            type: row.type === 'IN' ? 'INCOME' : (row.type === 'OUT' ? 'EXPENSE' : row.type)
        }));
    } catch (e) {
        console.error('getTransactions error:', e);
        return [];
    }
}

export async function addTransaction(data: any) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    await ensureDbInitialized();
    const id = Math.random().toString(36).substring(2, 12);

    try {
        await db.query(`
            INSERT INTO account_transactions (
                id, transaction_date, amount, type, category, description, payment_method, created_by, account_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
            id,
            data.date,
            data.amount,
            data.type,
            data.category,
            data.description,
            data.payment_method,
            session.name,
            data.account_id || null
        ]);

        revalidatePath('/business/accounts');
        revalidatePath('/business/sales');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteTransaction(id: string | number) {
    const session = await getSession();
    if (!session || session.job_title !== '대표자') return { success: false, error: 'Unauthorized' };

    await ensureDbInitialized();
    try {
        await db.query('DELETE FROM account_transactions WHERE id = $1', [id.toString()]);
        revalidatePath('/business/accounts');
        revalidatePath('/business/sales');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getAccountingStats(month: string) {
    await ensureDbInitialized();
    try {
        const res = await db.query(`
            SELECT 
                SUM(CASE WHEN type IN ('IN', 'INCOME') THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type IN ('OUT', 'EXPENSE') THEN amount ELSE 0 END) as expense
            FROM account_transactions
            WHERE CAST(transaction_date AS TEXT) LIKE $1
        `, [`${month}%`]);

        const row = res.rows[0];
        const income = parseInt(row.income || '0');
        const expense = parseInt(row.expense || '0');

        return {
            income,
            expense,
            profit: income - expense
        };
    } catch (e) {
        return { income: 0, expense: 0, profit: 0 };
    }
}

export async function saveFixedCost(data: any) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    const id = data.id || Math.random().toString(36).substring(2, 12);
    try {
        if (data.id) {
            await db.query(`
                UPDATE fixed_costs SET 
                    name = $1, amount = $2, due_day = $3, category = $4, account_id = $5
                WHERE id = $6
            `, [data.name, data.amount, data.due_day, data.category, data.account_id, id]);
        } else {
            await db.query(`
                INSERT INTO fixed_costs (id, name, amount, due_day, category, account_id)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [id, data.name, data.amount, data.due_day, data.category, data.account_id]);
        }
        revalidatePath('/business/accounts');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
