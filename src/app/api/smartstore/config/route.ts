import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await db.query("SELECT value FROM system_settings WHERE key = 'smartstore_config'");

        if (res.rows.length === 0) {
            return NextResponse.json({ success: true, exists: false });
        }

        const config = typeof res.rows[0].value === 'string'
            ? JSON.parse(res.rows[0].value)
            : res.rows[0].value;

        // Masking sensitive data
        return NextResponse.json({
            success: true,
            exists: true,
            config: {
                clientId: config.clientId ? `${config.clientId.substring(0, 4)}****` : '',
                clientSecret: config.clientSecret ? `**** (length: ${config.clientSecret.length})` : '',
                proxyBaseUrl: config.proxyBaseUrl || ''
            }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { clientId, clientSecret, proxyBaseUrl } = body;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ success: false, error: 'clientId and clientSecret are required' }, { status: 400 });
        }

        const config = { clientId, clientSecret, proxyBaseUrl };
        const value = JSON.stringify(config);

        await db.query(`
            INSERT INTO system_settings (key, value) 
            VALUES ('smartstore_config', $1)
            ON CONFLICT (key) DO UPDATE SET 
                value = $1, 
                updated_at = CURRENT_TIMESTAMP
        `, [value]);

        return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
