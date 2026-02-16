
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');

        let query = 'SELECT * FROM exhibition_sync_logs';
        let params: any[] = [];

        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const { rows } = await db.query(query, params);
        const { rows: countRows } = await db.query('SELECT COUNT(*) as count FROM exhibition_sync_logs' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);

        return handleSuccess({
            logs: rows,
            total: countRows[0]?.count || 0
        });
    } catch (error: any) {
        return handleApiError(error, 'Sync Logs API');
    }
}
