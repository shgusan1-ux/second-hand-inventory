import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDbInitialized();
    const startTime = Date.now();

    try {
        // 1. Database & AI Credits Check
        let aiUsage = { total_tokens: 0, usage_count: 0 };
        try {
            const { rows: aiRows } = await db.query(`
                SELECT SUM(token_count) as total_tokens, COUNT(*) as usage_count 
                FROM ai_usage_logs 
                WHERE created_at >= date('now', 'start of day')
            `);
            if (aiRows && aiRows[0]) {
                aiUsage = {
                    total_tokens: Number(aiRows[0].total_tokens || 0),
                    usage_count: Number(aiRows[0].usage_count || 0)
                };
            }
        } catch (e) {
            console.warn('[STATUS_API] AI Usage check failed:', e);
        }

        const totalCredits = 1000000;
        const remainingCredits = totalCredits - aiUsage.total_tokens;

        // 2. Naver Sync Status
        let lastSync: any = null;
        try {
            // First try naver_products (from db-init.ts)
            const { rows: naverRows } = await db.query(`
                SELECT MAX(synced_at) as last_sync FROM naver_products
            `);
            lastSync = naverRows[0]?.last_sync;
        } catch (e) {
            console.warn('[STATUS_API] naver_products check failed, trying naver_product_map:', e);
            try {
                // Fallback to naver_product_map (from db.ts)
                const { rows: naverMapRows } = await db.query(`
                    SELECT MAX(last_synced_at) as last_sync FROM naver_product_map
                `);
                lastSync = naverMapRows[0]?.last_sync;
            } catch (e2) {
                console.warn('[STATUS_API] Both Naver tables check failed:', e2);
            }
        }

        // 3. Database Latency
        const dbLatency = Date.now() - startTime;

        // 4. Server Uptime
        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeStr = `${days}일 ${hours}시간 ${minutes}분`;

        const dbStatus = dbLatency < 50 ? 'healthy' : dbLatency < 200 ? 'degraded' : 'down';
        const aiStatus = remainingCredits > 10000 ? 'healthy' : remainingCredits > 0 ? 'degraded' : 'down';

        let naverStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
        let lastSyncStr = '정보 없음';

        if (lastSync) {
            // SQLite and other DBs might return different string/date formats
            // Convert to a robust Date object (replace space with T for ISO-like parsing)
            const dateStr = String(lastSync).includes(' ') ? String(lastSync).replace(' ', 'T') : String(lastSync);
            const syncDate = new Date(dateStr);

            if (!isNaN(syncDate.getTime())) {
                const diffMs = Date.now() - syncDate.getTime();
                const diffMins = Math.floor(diffMs / 60000);

                if (diffMins < 60) {
                    lastSyncStr = `${diffMins}분 전`;
                    naverStatus = 'healthy';
                } else if (diffMins < 1440) { // 24 hours
                    lastSyncStr = `${Math.floor(diffMins / 60)}시간 전`;
                    naverStatus = 'degraded';
                } else {
                    lastSyncStr = `${Math.floor(diffMins / 1440)}일 전`;
                    naverStatus = 'down';
                }
            } else {
                lastSyncStr = '날짜 오류';
                naverStatus = 'degraded';
            }
        } else {
            naverStatus = 'degraded';
        }

        return NextResponse.json({
            database: { status: dbStatus, latency: dbLatency },
            naverApi: { status: naverStatus, lastSync: lastSyncStr },
            aiService: {
                status: aiStatus,
                credits: remainingCredits,
                todayUsage: aiUsage.usage_count
            },
            server: { status: 'healthy', uptime: uptimeStr, memory: 'N/A' }
        });

    } catch (error: any) {
        console.error('[CRITICAL] System status check failed:', error);
        return NextResponse.json({
            database: { status: 'down', latency: 0 },
            naverApi: { status: 'down', lastSync: '오류' },
            aiService: { status: 'down', credits: 0, todayUsage: 0 },
            server: { status: 'down', uptime: '0시간', error: error.message }
        }, { status: 500 });
    }
}
