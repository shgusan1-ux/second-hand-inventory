import { db } from '../src/lib/db';

async function verify() {
    console.log('--- DB Verification ---');
    try {
        // a) Table existence
        const tables = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'system_settings'
        `);
        console.log('1. system_settings table exists:', tables.rows.length > 0);

        // b) row existence
        const config = await db.query(`
            SELECT key, updated_at 
            FROM system_settings 
            WHERE key = 'smartstore_config'
        `);
        console.log('2. smartstore_config row exists:', config.rows.length > 0);
        if (config.rows.length > 0) {
            console.log('   Last updated:', config.rows[0].updated_at);
        }
    } catch (e: any) {
        console.error('Verification error:', e.message);
    }
}

verify();
