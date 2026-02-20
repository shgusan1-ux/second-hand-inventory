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
        // Get total tokens today
        const { rows: aiRows } = await db.query(`
      SELECT SUM(token_count) as total_tokens, COUNT(*) as usage_count 
      FROM ai_usage_logs 
      WHERE created_at >= date('now', 'start of day')
    `);
        const aiUsage = aiRows[0] || { total_tokens: 0, usage_count: 0 };

        // Simulate AI credits (Total available - used)
        // Assume 1,000,000 tokens limit per month or something
        const totalCredits = 1000000;
        const remainingCredits = totalCredits - (aiUsage.total_tokens || 0);

        // 2. Naver Sync Status
        // Get last sync time from naver_products (most recent update)
        const { rows: naverRows } = await db.query(`
      SELECT MAX(updated_at) as last_sync 
      FROM naver_products
    `);
        const lastSync = naverRows[0]?.last_sync;

        // 3. Database Latency
        const dbLatency = Date.now() - startTime;

        // 4. Server Uptime
        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptimeStr = `${days}일 ${hours}시간 ${minutes}분`;

        // Determine status
        const dbStatus = dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'down';
        const aiStatus = remainingCredits > 10000 ? 'healthy' : remainingCredits > 0 ? 'degraded' : 'down';

        // Naver status logic: healthy if synced within 1 hour
        let naverStatus = 'healthy';
        let lastSyncStr = '정보 없음';

        if (lastSync) {
            const diffMs = Date.now() - new Date(lastSync).getTime();
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
            naverStatus = 'degraded'; // No history
        }

        return NextResponse.json({
            database: { status: dbStatus, latency: dbLatency },
            naverApi: { status: naverStatus, lastSync: lastSyncStr },
            aiService: {
                status: aiStatus,
                credits: remainingCredits,
                todayUsage: aiUsage.usage_count
            },
            server: { status: 'healthy', uptime: uptimeStr, memory: 'N/A' } // Node.js memory usage could be added
        });

    } catch (error) {
        console.error('System status check failed:', error);
        return NextResponse.json({
            database: { status: 'down', latency: 0 },
            naverApi: { status: 'down', lastSync: '오류' },
            aiService: { status: 'down', credits: 0, todayUsage: 0 },
            server: { status: 'down', uptime: '0시간', memory: '0%' }
        }, { status: 500 });
    }
}
