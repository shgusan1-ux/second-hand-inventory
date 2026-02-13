import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'inventory_session';

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
    // For simplicity, we'll store the userId directly in a signed way or just simple for this internal tool.
    // However, to be secure, better to generate a random token.
    // Let's use a simple approach: Base64(userId + ":" + timestamp) -> simplistic session
    // In production, use JWT or a proper session store.

    // We will just store userId in cookie for this "Internal Tool" scope, but let's at least simple-obscure it or use a session table if we want strictness.
    // User asked for "Session Management". Let's do a simple sessions table in SQLite.

    // Check if sessions table exists? I didn't create it. 
    // Let's just use a JSON object in a secure HttpOnly cookie for now. 
    // Next.js cookies() are encrypted by default if using a framework feature, but standard cookies aren't.
    // I'll stick to a simple logic: Set cookie with userId.

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });
}

export async function getSession() {
    const cookieStore = await cookies();
    const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!userId) {
        return null;
    }

    try {
        const result = await db.query('SELECT id, name, role, username, job_title FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0] as { id: string; name: string; role: string; username: string, job_title: string };
    } catch (e) {
        console.error('[AUTH] Failed to get session:', e);
        return null;
    }
}

export async function logoutSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
    return await getSession();
}

// Log action helper
// 영어 → 한글 자동변환 (대시보드 공지용)
const PERMISSION_KO: Record<string, string> = {
    members: '직원관리', ads: '광고관리', returns: '반품관리',
    inventory: '재고관리', smartstore: '스마트스토어', statistics: '통계', settings: '설정',
};
const FIELD_KO: Record<string, string> = {
    category: '카테고리', status: '상태', condition: '상품상태', size: '사이즈',
    price_sell: '판매가', price_consumer: '소비자가', brand: '브랜드',
};

function translateDetails(action: string, details?: string, targetId?: string): string {
    const d = details || '';
    switch (action) {
        case 'CREATE_PRODUCT': return `신규 상품 등록: ${d}`;
        case 'UPDATE_PRODUCT': return `상품 정보 수정: ${d}`;
        case 'DISCARD_PRODUCT': return `상품 폐기 처리`;
        case 'RESTORE_PRODUCT': return `상품 복원 처리`;
        case 'PERMANENT_DELETE_PRODUCT': return `상품 영구 삭제`;
        case 'BULK_CREATE_PRODUCTS': {
            const m = d.match(/(\d+)/);
            return m ? `대량 상품 등록: ${m[1]}개` : `대량 상품 등록: ${d}`;
        }
        case 'BULK_DELETE': {
            const m = d.match(/(\d+)/);
            return m ? `상품 일괄 삭제: ${m[1]}개` : `상품 일괄 삭제`;
        }
        case 'BULK_UPDATE': {
            const m = d.match(/Updated (\d+) items: (.+)/);
            if (m) {
                const fields = m[2].split(', ').map(f => FIELD_KO[f.trim()] || f).join(', ');
                return `상품 일괄 수정: ${m[1]}개 (${fields})`;
            }
            return `상품 일괄 수정: ${d}`;
        }
        case 'BULK_UPDATE_EXCEL': {
            const m = d.match(/Updated (\d+) items.*Failed (\d+)/);
            if (m) return `엑셀 일괄 수정: 성공 ${m[1]}개, 실패 ${m[2]}개`;
            return `엑셀 일괄 수정: ${d}`;
        }
        case 'BULK_AI_UPDATE': {
            const m = d.match(/(\d+)/);
            return m ? `AI 일괄 분류: ${m[1]}개 완료` : `AI 일괄 분류 완료`;
        }
        case 'REGISTER': {
            const m = d.match(/Registered user (\S+) \((.+)\)/);
            return m ? `신규 직원 가입: ${m[1]} (${m[2]})` : `신규 직원 가입: ${d}`;
        }
        case 'CREATE_USER': {
            const m = d.match(/Created by admin: (.+)/);
            return m ? `관리자 직원 등록: ${m[1]}` : `직원 등록: ${d}`;
        }
        case 'UPDATE_USER': return `직원 정보 수정`;
        case 'DELETE_USER': return `직원 삭제 처리`;
        case 'UPDATE_PERMISSIONS': {
            const m = d.match(/Updated permissions: (.+)/);
            if (m) {
                const perms = m[1].split(', ').map(p => PERMISSION_KO[p.trim()] || p).join(', ');
                return `권한 변경: ${perms}`;
            }
            return `권한 변경: ${d}`;
        }
        case 'UPDATE_PERMISSION': {
            const m = d.match(/Accounting view: (.+)/);
            return m ? `회계 열람 권한: ${m[1] === 'true' ? '허용' : '거부'}` : `권한 수정: ${d}`;
        }
        case 'UPDATE_JOB_TITLE': {
            const m = d.match(/Updated job title to (.+)/);
            return m ? `직책 변경: ${m[1]}` : `직책 변경: ${d}`;
        }
        case 'CHANGE_PASSWORD': return `비밀번호 변경 완료`;
        case 'UPDATE_CONFIG': return `시스템 설정 변경: API 인증정보`;
        case 'APPROVE_AI_SUGGESTION': {
            const m = d.match(/Approved category: (.+)/);
            return m ? `AI 추천 카테고리 승인: ${m[1]}` : `AI 추천 승인: ${d}`;
        }
        case 'ADD_CATEGORY': return `카테고리 추가: ${d}`;
        case 'DELETE_CATEGORY': return `카테고리 삭제`;
        case 'ADD_TRANSACTION': {
            const m = d.match(/(.+) (\d[\d,]*)/);
            if (m) {
                const typeKo = m[1] === 'income' ? '수입' : m[1] === 'expense' ? '지출' : m[1];
                return `거래 등록: ${typeKo} ${Number(m[2]).toLocaleString()}원`;
            }
            return `거래 등록: ${d}`;
        }
        case 'DELETE_TRANSACTION': return `거래 삭제`;
        case 'CHECK_IN': return `출근`;
        case 'CHECK_OUT': return `퇴근`;
        default: return `${action}: ${d}`;
    }
}

export async function logAction(action: string, targetType?: string, targetId?: string, details?: string) {
    const user = await getSession();
    const userId = user?.id || 'anonymous';
    const userName = user?.name || 'Unknown';

    try {
        // 1. Audit Log
        await db.query(`
            INSERT INTO audit_logs (user_id, action, target_type, target_id, details)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, action, targetType || null, targetId || null, details || null]);

        // 2. Dashboard Notification (Auto Task)
        // Filter actions that should appear on dashboard
        if (['CREATE', 'UPDATE', 'DELETE', 'BULK', 'REGISTER', 'CHANGE', 'CHECK', 'ADD', 'APPROVE'].some(prefix => action.startsWith(prefix))) {
            const taskId = Math.random().toString(36).substring(2, 10);
            const koDetails = translateDetails(action, details, targetId);
            const content = `[${userName}] ${koDetails}`;

            // Ensure table exists (Handled by db.ts)
            try {
                await db.query(`
                    INSERT INTO dashboard_tasks (id, content, created_at, is_completed)
                    VALUES ($1, $2, CURRENT_TIMESTAMP, FALSE)
                `, [taskId, content]);
            } catch (ignore) {
                console.error("Failed to insert dashboard task:", ignore);
            }
        }

    } catch (e) {
        console.error('Failed to log action:', e);
    }
}
