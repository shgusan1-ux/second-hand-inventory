
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
    const { getDetailedRegistrationStats, getInventoryFlowStats } = await import('./src/lib/stats-actions');
    const { getNaverOrderList } = await import('./src/lib/naver/apis/orders');

    log('\n--- Testing DB Stats ---');
    try {
        const regStats = await getDetailedRegistrationStats();
        log('Detailed Reg Stats: ' + JSON.stringify(regStats, null, 2));

        const flowStats = await getInventoryFlowStats();
        log('Flow Stats (First 3): ' + JSON.stringify(flowStats.slice(0, 3), null, 2));
    } catch (e: any) {
        log('DB Stats Error: ' + e.message);
        log('Stack: ' + e.stack);
    }

    log('\n--- Testing Naver API ---');
    try {
        // Test with 30 days
        const orders = await getNaverOrderList(30);
        // Naver response structure check
        if (!orders) {
            log('Orders response is null/undefined');
        } else {
            // Try to find content
            // The structure might be orders.data.content or just orders.content depending on the proxy response wrapper
            const content = orders?.data?.content || orders?.content || orders?.lastChangedStatuses;

            if (content) {
                log(`Success! Found ${content.length} orders.`);
                if (content.length > 0) {
                    log('Sample Order: ' + JSON.stringify(content[0], null, 2));
                }
            } else {
                log('Response received but content not found.');
                log('Keys: ' + Object.keys(orders).join(', '));
                if (orders.data) log('Data keys: ' + Object.keys(orders.data).join(', '));
                log('Full Response Preview: ' + JSON.stringify(orders, null, 2).substring(0, 500) + '...');
            }
        }
    } catch (e: any) {
        log('Naver API Error: ' + e.message);
        log('Stack: ' + e.stack);
    }

    log('\n--- Testing Naver API (getNaverOrders - Last Changed) ---');
    try {
        const { getNaverOrders } = await import('./src/lib/naver/apis/orders');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        log(`Requesting Last Changed Statuses from: ${thirtyDaysAgo}`);
        const orders = await getNaverOrders({ startDateTime: thirtyDaysAgo });

        if (!orders) {
            log('Response is null/undefined');
        } else {
            // Accessing structure based on previous findings or assumptions
            // lastChangedStatuses is typical for this endpoint
            const content = orders?.data?.lastChangeStatuses || orders?.lastChangeStatuses || orders?.lastChangedStatuses;

            if (content) {
                log(`Success! Found ${content.length} changed status records.`);
                if (content.length > 0) {
                    log('Sample Record: ' + JSON.stringify(content[0], null, 2));
                }
            } else {
                log('Response received but content not found.');
                log('Keys: ' + Object.keys(orders).join(', '));
                log('Full Response Preview: ' + JSON.stringify(orders, null, 2).substring(0, 500) + '...');
            }
        }
    } catch (e: any) {
        log('Naver API Error: ' + e.message);
        log('Stack: ' + e.stack);
    }

    fs.writeFileSync('test-results.txt', output);
    console.log('Results written to test-results.txt');
}

test();
