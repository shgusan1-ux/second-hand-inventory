import { db } from './db';

const SYSTEM_UPDATES = [
    {
        id: 'sys-v1.2.0',
        content: '📢 [시스템 업데이트 v1.2.0] 브랜드명 Brownstreet 변경 완료'
    },
    {
        id: 'sys-v1.2.1',
        content: '🐛 [버그 수정 v1.2.1] 로그인/회원가입 페이지 접속 오류 해결 (React 19 대응)'
    },
    {
        id: 'sys-v1.2.2',
        content: '✨ [기능 개선 v1.2.2] 재고 등록 페이지 통합 (개별/대량/코너로지스 탭 분류)'
    },
    {
        id: 'sys-v1.2.3',
        content: '🌤 [기능 추가 v1.2.3] AI 날씨 전략 위젯 고도화 (오늘/주간/월간/계절별 제안)'
    },
    {
        id: 'sys-v1.2.4',
        content: '🔔 [기능 추가 v1.2.4] 직원 활동 내역 자동 알림 및 시스템 업데이트 공지 기능 추가'
    }
];

export async function checkSystemUpdates() {
    try {
        // Ensure table exists (redundant but safe)
        await db.query(`
             CREATE TABLE IF NOT EXISTS dashboard_tasks (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP
            )
        `);

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
