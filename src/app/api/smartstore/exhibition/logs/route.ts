
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');
        const target_category = searchParams.get('target_category');
        const synced_by = searchParams.get('synced_by');
        const batch_time = searchParams.get('batch_time'); // 'YYYY-MM-DD HH:mm'

        let query = 'SELECT * FROM exhibition_sync_logs WHERE 1=1';
        let params: any[] = [];

        if (status) {
            params.push(status);
            query += ' AND status = $' + params.length;
        }
        if (target_category) {
            params.push(target_category);
            query += ' AND target_category = $' + params.length;
        }
        if (synced_by) {
            params.push(synced_by);
            query += ' AND synced_by = $' + params.length;
        }
        if (batch_time) {
            params.push(batch_time);
            query += ' AND strftime(\'%Y-%m-%d %H:%M\', created_at) = $' + params.length;
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
        const countParams = [...params];

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const { rows } = await db.query(query, params);
        const { rows: countRows } = await db.query(countQuery, countParams);

        return handleSuccess({
            logs: rows,
            total: countRows[0]?.count || 0
        });
    } catch (error: any) {
        return handleApiError(error, 'Sync Logs API');
    }
}
