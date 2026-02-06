import { db } from './db';

export const SYSTEM_UPDATES = [
    {
        id: 'admin-patch-v2.0.1',
        content: '🔒 [관리자] 관리자 전용 : 보안 설정 강화 및 비밀번호 정책 업데이트'
    },
    {
        id: 'admin-patch-v2.0.0',
        content: '⚙️ [관리자] 관리자 대시보드 : 시스템 패치 로그 위젯 신규 리뉴얼'
    },
    {
        id: 'admin-patch-v1.9.5',
        content: '👥 [관리자] 회원 관리 : 관리자 권한 부여 프로세스 간소화'
    }
];

export async function checkSystemUpdates() {
    try {
        await db.query(`
             CREATE TABLE IF NOT EXISTS dashboard_tasks (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP
            )
        `);

        // Cleanup old non-admin system updates (optional cleanup)
        // Removes specific old version patterns if needed to clean up display
        await db.query("DELETE FROM dashboard_tasks WHERE id LIKE 'sys-v%'");

        for (const update of SYSTEM_UPDATES) {
            // Check if exists
            const existing = await db.query('SELECT 1 FROM dashboard_tasks WHERE id = $1', [update.id]);
            if (existing.rows.length === 0) {
                await db.query(`
                    INSERT INTO dashboard_tasks (id, content, created_at, is_completed)
                    VALUES ($1, $2, CURRENT_TIMESTAMP, FALSE)
                `, [update.id, update.content]);
                // console.log(`System update ${update.id} inserted.`);
            }
        }
    } catch (e) {
        console.error('Failed to sync system updates:', e);
    }
}
