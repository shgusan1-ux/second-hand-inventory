'use server';

import { db } from './db';
import { getSession, logAction } from './auth';
import { revalidatePath } from 'next/cache';

// Member actions no longer need local ensureTables as db.ts handles central initialization

// --- Permissions ---

export async function getUserPermissions(userId: string) {
    try {
        // 1. Check explicit permissions
        const res = await db.query('SELECT category FROM user_permissions WHERE user_id = $1', [userId]);
        const permissions = res.rows.map((r: any) => r.category);

        // 2. Super Admin Bypass (Job Title) OR 'ADMIN' permission
        const userRes = await db.query('SELECT job_title FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];

        // ADMIN permission flag OR specific job titles
        // '점장' added as requested
        if (permissions.includes('ADMIN') || (user && ['대표자', '경영지원', '점장'].includes(user.job_title))) {
            if (!permissions.includes('ALL')) return ['ALL', ...permissions];
            return permissions;
        }

        return permissions;
    } catch (e) {
        return [];
    }
}

async function isAuthorized() {
    const session = await getSession();
    if (!session) return false;
    const perms = await getUserPermissions(session.id);
    return perms.includes('ALL');
}

export async function updateUserPermissions(targetUserId: string, categories: string[]) {
    // Check Auth
    if (!(await isAuthorized())) return { success: false, error: 'Unauthorized' };

    try {
        // Preserve ADMIN permission if it exists, as UI usually sends only standard categories
        const existingAdmin = await db.query('SELECT 1 FROM user_permissions WHERE user_id = $1 AND category = $2', [targetUserId, 'ADMIN']);
        const hasAdmin = existingAdmin.rows.length > 0;

        // Clear existing
        await db.query('DELETE FROM user_permissions WHERE user_id = $1', [targetUserId]);

        // Insert new
        for (const cat of categories) {
            if (cat !== 'ADMIN') {
                await db.query('INSERT INTO user_permissions (user_id, category) VALUES ($1, $2)', [targetUserId, cat]);
            }
        }

        // Restore ADMIN
        if (hasAdmin) {
            await db.query('INSERT INTO user_permissions (user_id, category) VALUES ($1, $2)', [targetUserId, 'ADMIN']);
        }

        await logAction('UPDATE_PERMISSIONS', 'user', targetUserId, `Updated permissions: ${categories.join(', ')}`);
        revalidatePath('/members');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to update permissions' };
    }
}

export async function toggleAdminPermission(targetUserId: string, isAdmin: boolean) {
    // Check Auth
    if (!(await isAuthorized())) return { success: false, error: 'Unauthorized' };

    try {
        if (isAdmin) {
            // Check existence to avoid unique constraint if simplistic DB
            const check = await db.query('SELECT 1 FROM user_permissions WHERE user_id = $1 AND category = $2', [targetUserId, 'ADMIN']);
            if (check.rows.length === 0) {
                await db.query('INSERT INTO user_permissions (user_id, category) VALUES ($1, $2)', [targetUserId, 'ADMIN']);
            }
        } else {
            await db.query(`DELETE FROM user_permissions WHERE user_id = $1 AND category = 'ADMIN'`, [targetUserId]);
        }

        await logAction('UPDATE_PERMISSIONS', 'user', targetUserId, `Admin permission ${isAdmin ? 'granted' : 'revoked'}`);
        revalidatePath('/members');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
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
    const dateStr = getKSTDate();
    try {
        const res = await db.query('SELECT * FROM attendance_logs WHERE user_id = $1 AND work_date = $2', [userId, dateStr]);
        return res.rows[0] || null;
    } catch (e) {
        return null;
    }
}

// Helper: Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export async function checkIn(locationData?: { lat: number; lon: number }, lateReason?: string) {
    const session = await getSession();
    if (!session) return { success: false, error: '로그인이 필요합니다.' };

    const dateStr = getKSTDate();
    const nowISO = getKSTISO();
    const nowTime = new Date(nowISO);

    // 1. 위치 검증 (관리자 설정이 있을 경우)
    const userRes = await db.query('SELECT allowed_locations, attendance_score FROM users WHERE id = $1', [session.id]);
    const userData = userRes.rows[0];

    if (userData?.allowed_locations) {
        if (!locationData) return { success: false, error: '위치 정보가 필요합니다.' };

        const allowed = JSON.parse(userData.allowed_locations); // Array of {lat, lon, name, radius}
        let isInRange = false;
        let matchedLocation = '';

        for (const loc of allowed) {
            const dist = getDistance(locationData.lat, locationData.lon, loc.lat, loc.lon);
            if (dist <= (loc.radius || 100)) { // 기본 100m
                isInRange = true;
                matchedLocation = loc.name;
                break;
            }
        }

        if (!isInRange) {
            return { success: false, error: '지정된 장소에서만 출근이 가능합니다.' };
        }
    }

    // 2. 지각 처리 및 점수 차감
    let scoreImpact = 0;
    const isLate = nowTime.getHours() >= 9 && nowTime.getMinutes() > 0; // 09:00 기준

    if (isLate) {
        if (!lateReason) return { success: false, error: '지각 사유를 입력해주세요.', needsReason: true };
        scoreImpact = -5;
    }

    // Check if exists
    const existing = await getTodayAttendance(session.id);
    if (existing) return { success: false, error: '이미 출근 처리되었습니다.' };

    const id = Math.random().toString(36).substring(2, 12);
    try {
        await db.query(`
            INSERT INTO attendance_logs (id, user_id, work_date, check_in, late_reason, check_in_location, score_impact)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            id,
            session.id,
            dateStr,
            nowISO,
            lateReason || null,
            locationData ? JSON.stringify(locationData) : null,
            scoreImpact
        ]);

        if (scoreImpact !== 0) {
            await db.query('UPDATE users SET attendance_score = attendance_score + $1 WHERE id = $2', [scoreImpact, session.id]);
        }

        await logAction('CHECK_IN', 'attendance', id, isLate ? `지각 출근: ${lateReason}` : '정상 출근');
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: '출근 처리 실패: ' + e.message };
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

        await logAction('CHECK_OUT', 'attendance', session.id, '퇴근');
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

// --- Correction System ---

export async function requestCorrection(date: string, checkIn: string, checkOut: string, reason: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    // Check if log exists for that date
    const existing = await db.query('SELECT id FROM attendance_logs WHERE user_id = $1 AND work_date = $2', [session.id, date]);
    let logId = existing.rows[0]?.id;

    const correctionData = JSON.stringify({ checkIn, checkOut, reason });

    try {
        if (logId) {
            await db.query(`
                UPDATE attendance_logs 
                SET correction_status = 'Pending', correction_data = $1
                WHERE id = $2
            `, [correctionData, logId]);
        } else {
            // Create new log if missing (e.g. forgot to check in at all)
            logId = Math.random().toString(36).substring(2, 12);
            await db.query(`
                INSERT INTO attendance_logs (id, user_id, work_date, correction_status, correction_data)
                VALUES ($1, $2, $3, 'Pending', $4)
            `, [logId, session.id, date, correctionData]);
        }

        await logAction('REQ_CORRECTION', 'attendance', logId, `정정 요청: ${date}`);
        revalidatePath('/business/hr/attendance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function approveCorrection(id: string) {
    if (!(await isAuthorized())) return { success: false, error: 'Unauthorized' };
    const session = await getSession(); // needed for name

    try {
        const res = await db.query('SELECT correction_data FROM attendance_logs WHERE id = $1', [id]);
        if (!res.rows[0]?.correction_data) return { success: false, error: 'No data' };

        const data = JSON.parse(res.rows[0].correction_data);

        await db.query(`
            UPDATE attendance_logs 
            SET check_in = $1, check_out = $2, correction_status = 'Approved', note = $3
            WHERE id = $4
        `, [data.checkIn, data.checkOut, 'Approved by ' + session!.name, id]);

        await logAction('APPROVE_CORRECTION', 'attendance', id, '정정 승인');
        revalidatePath('/business/hr/attendance');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function rejectCorrection(id: string) {
    if (!(await isAuthorized())) return { success: false, error: 'Unauthorized' };

    try {
        await db.query(`
            UPDATE attendance_logs 
            SET correction_status = 'Rejected'
            WHERE id = $1
        `, [id]);
        revalidatePath('/business/hr/attendance');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed' };
    }
}

export async function getPendingCorrections() {
    if (!(await isAuthorized())) return [];
    try {
        const res = await db.query(`
            SELECT l.*, u.name as user_name, u.job_title
            FROM attendance_logs l
            JOIN users u ON l.user_id = u.id
            WHERE l.correction_status = 'Pending'
            ORDER BY l.work_date DESC
        `);
        return res.rows;
    } catch (e) {
        return [];
    }
}


export async function updateUserJobTitle(targetUserId: string, newJobTitle: string) {
    if (!(await isAuthorized())) return { success: false, error: 'Unauthorized' };

    try {
        await db.query('UPDATE users SET job_title = $1 WHERE id = $2', [newJobTitle, targetUserId]);
        await logAction('UPDATE_JOB_TITLE', 'user', targetUserId, `Updated job title to ${newJobTitle}` /* 한글변환은 auth.ts에서 처리 */);
        revalidatePath('/members');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to update job title' };
    }
}

export async function getUsers() {
    const session = await getSession();
    if (!session) return [];

    try {
        const res = await db.query('SELECT id, name, username, job_title FROM users ORDER BY name ASC');
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function getUsersWithPermissions() {
    const session = await getSession();
    if (!session) return [];

    // Fetch users
    const usersRes = await db.query('SELECT id, username, name, job_title, email, created_at, role, attendance_score, allowed_locations FROM users ORDER BY name ASC');
    const users = usersRes.rows;

    // Fetch permissions
    const permsRes = await db.query('SELECT user_id, category FROM user_permissions');
    const permsMap: Record<string, string[]> = {};

    permsRes.rows.forEach(r => {
        if (!permsMap[r.user_id]) permsMap[r.user_id] = [];
        permsMap[r.user_id].push(r.category);
    });

    return users.map(u => {
        let permissions = permsMap[u.id] || [];

        // Admin Logic - Sync with getUserPermissions
        if (permissions.includes('ADMIN') || ['대표자', '경영지원', '점장'].includes(u.job_title)) {
            if (!permissions.includes('ALL')) permissions = ['ALL', ...permissions];
        }

        return {
            ...u,
            permissions
        };
    });
}

export async function getAllTodayAttendance() {
    const dateStr = getKSTDate();
    try {
        const res = await db.query(`
            SELECT 
                u.id, 
                u.name, 
                u.job_title,
                l.work_date,
                l.check_in,
                l.check_out,
                l.correction_status
            FROM users u
            LEFT JOIN attendance_logs l ON u.id = l.user_id AND l.work_date = $1
            ORDER BY u.name ASC
        `, [dateStr]);
        return res.rows;
    } catch (e) {
        console.error("Failed to fetch all today attendance:", e);
        return [];
    }
}

// --- User Settings ---

export async function updateUserLocations(targetUserId: string, locations: { lat: number; lon: number; name: string; radius?: number }[]) {
    if (!(await isAuthorized())) return { success: false, error: '권한이 없습니다.' };

    try {
        await db.query('UPDATE users SET allowed_locations = $1 WHERE id = $2', [JSON.stringify(locations.slice(0, 2)), targetUserId]);
        await logAction('UPDATE_LOCATIONS', 'user', targetUserId, `출근 가능 지역 설정: ${locations.map(l => l.name).join(', ')}`);
        revalidatePath('/members');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function resetAttendanceScore(targetUserId: string) {
    if (!(await isAuthorized())) return { success: false, error: '권한이 없습니다.' };
    await db.query('UPDATE users SET attendance_score = 100 WHERE id = $1', [targetUserId]);
    revalidatePath('/members');
    return { success: true };
}
