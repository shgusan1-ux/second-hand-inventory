import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const proxyUrl = process.env.SMARTSTORE_PROXY_URL;
        const proxyKey = process.env.SMARTSTORE_PROXY_KEY;
        let clientId = process.env.NAVER_CLIENT_ID;
        let clientSecret = process.env.NAVER_CLIENT_SECRET;

        // Fallback to DB if ENV is missing
        if (!clientId || !clientSecret) {
            const res = await db.query("SELECT value FROM system_settings WHERE key = 'smartstore_config'");
            if (res.rows.length > 0) {
                const config = typeof res.rows[0].value === 'string' ? JSON.parse(res.rows[0].value) : res.rows[0].value;
                clientId = clientId || config.clientId;
                clientSecret = clientSecret || config.clientSecret;
            }
        }

        if (!proxyUrl || !proxyKey) {
            return NextResponse.json({ success: false, error: 'Proxy configuration (SMARTSTORE_PROXY_URL/KEY) is missing in environment variables.' }, { status: 400 });
        }

        const results: any = {
            config: { proxyUrl, clientId: clientId ? '****' : 'missing' },
            stages: []
        };

        // Stage 1: Healthcheck
        try {
            const healthRes = await fetch(`${proxyUrl}/health`, {
                headers: { 'x-proxy-key': proxyKey },
                signal: AbortSignal.timeout(5000)
            });
            const healthData: any = await healthRes.json();
            results.stages.push({
                name: 'Proxy Healthcheck',
                status: healthData.ok ? 'SUCCESS' : 'FAILED',
                code: healthRes.status
            });
            if (!healthData.ok) throw new Error(`Healthcheck failed: ${healthRes.status}`);
        } catch (e: any) {
            results.stages.push({ name: 'Proxy Healthcheck', status: 'FAILED', error: e.message });
            return NextResponse.json({ success: false, ...results }, { status: 502 });
        }

        // Stage 2: Token 발급 테스트
        try {
            const { getNaverAccessToken } = await import('@/lib/naver/auth');
            const token = await getNaverAccessToken();

            results.stages.push({
                name: 'Naver Token via Proxy',
                status: 'SUCCESS',
                message: 'Token acquired successfully'
            });

        } catch (e: any) {
            results.stages.push({ name: 'Naver Token via Proxy', status: 'FAILED', error: e.message });
            return NextResponse.json({ success: false, ...results }, { status: 502 });
        }

        return NextResponse.json({ success: true, ...results });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
