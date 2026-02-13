'use server';

import { db } from './db';
import { getSession, logAction } from './auth';
import { ensureDbInitialized } from './db-init';
import { revalidatePath } from 'next/cache';

export interface ContractData {
    companyName: string;
    ceoName: string;
    employeeName: string;
    employeeAddress: string;
    startDate: string;
    endDate?: string;
    jobTitle: string;
    location: string;
    duties: string;
    workStartTime: string;
    workEndTime: string;
    breakTime: string;
    workDays: string; // "월~금"
    salaryType: 'monthly' | 'hourly'; // "월급" | "시급"
    salaryAmount: number;
    salaryDate: string; // "매월 10일"
    bonus: string;
    benefit: string;
}

// 계약서 생성 (초안)
export async function createContract(targetUserId: string, type: string, data: ContractData) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        return { success: false, error: '권한이 없습니다 (Unauthorized)' };
    }

    await ensureDbInitialized();

    const id = Math.random().toString(36).substring(2, 12);

    try {
        await db.query(`
            INSERT INTO employment_contracts (
                id, user_id, type, status, content_json, start_date, end_date, created_at
            ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, CURRENT_TIMESTAMP)
        `, [
            id,
            targetUserId,
            type,
            JSON.stringify(data),
            data.startDate,
            data.endDate || null
        ]);

        await logAction('CREATE_CONTRACT', 'contract', id, `계약서 생성: ${data.employeeName}`);
        revalidatePath('/business/hr');
        return { success: true, contractId: id };
    } catch (e: any) {
        console.error('Create contract error:', e);
        return { success: false, error: e.message };
    }
}

// 계약서 목록 조회 (관리자용 - 전체 / 직원용 - 본인것만)
export async function getContracts(userId?: string) {
    const session = await getSession();
    if (!session) return [];

    await ensureDbInitialized();

    try {
        // 관리자는 전체 조회 가능, 아니면 본인 것만
        /*
        if (['대표자', '경영지원'].includes(session.job_title) && !userId) {
             const res = await db.query(`
                SELECT c.*, u.name as user_name 
                FROM employment_contracts c
                LEFT JOIN users u ON c.user_id = u.id
                ORDER BY c.created_at DESC
            `);
            return res.rows;
        }
        */

        // 특정 유저 조회 또는 본인 조회
        const targetId = userId || session.id;

        // 권한 체크: 본인이거나 관리자만 타인 조회 가능
        if (targetId !== session.id && !['대표자', '경영지원'].includes(session.job_title)) {
            return [];
        }

        const res = await db.query(`
            SELECT c.*, u.name as user_name 
            FROM employment_contracts c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `, [targetId]);

        return res.rows;

    } catch (e) {
        console.error('Get contracts error:', e);
        return [];
    }
}

// 관리자용: 모든 계약서 조회
export async function getAllContracts() {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return [];

    await ensureDbInitialized();

    try {
        const res = await db.query(`
            SELECT c.*, u.name as user_name, u.username
            FROM employment_contracts c
            LEFT JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);
        return res.rows;
    } catch (e) {
        return [];
    }
}


// 계약서 상세 조회
export async function getContract(id: string) {
    const session = await getSession();
    if (!session) return null;

    await ensureDbInitialized();

    try {
        const res = await db.query(`
            SELECT c.*, u.name as employee_name
            FROM employment_contracts c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = $1
        `, [id]);

        const contract = res.rows[0];
        if (!contract) return null;

        // 권한 체크: 본인이거나 관리자
        if (contract.user_id !== session.id && !['대표자', '경영지원'].includes(session.job_title)) {
            return null;
        }

        return contract;
    } catch (e) {
        return null;
    }
}

// 서명 및 체결 완료
export async function signContract(id: string, signatureData: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    await ensureDbInitialized();

    try {
        // 본인 확인
        const check = await db.query('SELECT user_id, status FROM employment_contracts WHERE id = $1', [id]);
        const contract = check.rows[0];

        if (!contract) return { success: false, error: 'Contract not found' };
        if (contract.user_id !== session.id) return { success: false, error: '본인의 계약서만 서명할 수 있습니다.' };
        if (contract.status === 'signed') return { success: false, error: '이미 체결된 계약서입니다.' };

        await db.query(`
            UPDATE employment_contracts
            SET status = 'signed', signature_data = $1, signed_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [signatureData, id]);

        await logAction('SIGN_CONTRACT', 'contract', id, '계약서 서명 완료');
        revalidatePath('/members/contracts');
        revalidatePath('/business/hr');

        return { success: true };
    } catch (e: any) {
        console.error('Sign contract error:', e);
        return { success: false, error: e.message };
    }
}

// (관리자) 계약서 상태 변경 (예: 발송, 취소)
export async function updateContractStatus(id: string, status: string) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    await ensureDbInitialized();

    try {
        await db.query('UPDATE employment_contracts SET status = $1 WHERE id = $2', [status, id]);
        revalidatePath('/business/hr');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}
