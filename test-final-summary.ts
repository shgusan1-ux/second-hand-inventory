
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load envs FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
    let output = '';
    const log = (msg: string) => {
        console.log(msg);
        output += msg + '\n';
    };

    log('TURSO_URL: ' + (process.env.TURSO_DATABASE_URL ? 'Set' : 'Not Set'));
    log('NAVER_CLIENT_ID: ' + (process.env.NAVER_CLIENT_ID ? 'Set' : 'Not Set'));
    log('PROXY_URL: ' + (process.env.SMARTSTORE_PROXY_URL ? 'Set' : 'Not Set'));

    // Dynamic Import to ensure Env is loaded
    const { getOrdersSummary } = await import('./src/lib/naver/apis/stats');

    log('\n--- Testing Orders Summary (Final Logic) ---');
    try {
        // Test with 30 days
        const summary = await getOrdersSummary(30);
        log('Summary Result: ' + JSON.stringify(summary, null, 2));
    } catch (e: any) {
        log('Summary Error: ' + e.message);
        log('Stack: ' + e.stack);
    }

    fs.writeFileSync('test-final-summary.txt', output);
    console.log('Results written to test-final-summary.txt');
}

test();
