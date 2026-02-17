
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function GET() {
    try {
        // created_at을 분 단위로 그룹화하여 (전송 batch 단위로 추정) 요약 정보를 가져옵니다.
        const query = `
            SELECT 
                strftime('%Y-%m-%d %H:%M', created_at) as batch_time,
                MIN(created_at) as started_at,
                MAX(created_at) as ended_at,
                target_category,
                synced_by,
                COUNT(*) as total_count,
                SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) as fail_count
            FROM exhibition_sync_logs
            GROUP BY batch_time, target_category, synced_by
            ORDER BY batch_time DESC
            LIMIT 50
        `;

        const { rows } = await db.query(query);

        return handleSuccess({
            summaries: rows
        });
    } catch (error: any) {
        return handleApiError(error, 'Sync Logs Summary API');
    }
}
