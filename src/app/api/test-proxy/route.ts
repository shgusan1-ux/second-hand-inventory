import { NextResponse } from 'next/server';
import { handleApiError, handleAuthError, handleSuccess } from '@/lib/api-utils';

export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        env: {
            NEXT_PUBLIC_PROXY_URL: process.env.NEXT_PUBLIC_PROXY_URL,
            NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID,
            hasSecret: !!process.env.NAVER_CLIENT_SECRET,
        },
        tests: []
    };

    const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://15.164.216.212:3001';

    // Test 1: Health Check
    try {
        console.log('[TEST] Health check...');
        const res = await fetch(`${PROXY_URL}/health`);
        const data = await res.json();

        results.tests.push({
            name: 'Health Check',
            status: res.status,
            ok: res.ok,
            data
        });
    } catch (error: any) {
        results.tests.push({
            name: 'Health Check',
            error: error.message,
            stack: error.stack
        });
    }

    // Test 2: Token Request
    try {
        console.log('[TEST] Token request...');
        const res = await fetch(`${PROXY_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.NAVER_CLIENT_ID,
                client_secret: process.env.NAVER_CLIENT_SECRET,
                grant_type: 'client_credentials'
            })
        });

        const data = await res.json();

        results.tests.push({
            name: 'Token Request',
            status: res.status,
            ok: res.ok,
            hasToken: !!data.access_token,
            tokenPreview: data.access_token ? data.access_token.substring(0, 10) + '...' : null,
            expiresIn: data.expires_in
        });

        // Test 3: Products Search
        if (data.access_token) {
            console.log('[TEST] Products search...');
            const res2 = await fetch(`${PROXY_URL}/v1/products/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ page: 1, size: 5 })
            });

            const data2 = await res2.json();

            results.tests.push({
                name: 'Products Search',
                status: res2.status,
                ok: res2.ok,
                count: data2.contents?.length || 0,
                totalCount: data2.totalCount,
                firstProduct: data2.contents?.[0]?.channelProducts?.[0]?.name || null
            });
        }
    } catch (error: any) {
        results.tests.push({
            name: 'Token/Products',
            error: error.message,
            stack: error.stack
        });
    }

    return NextResponse.json(results, { status: 200 });
}
