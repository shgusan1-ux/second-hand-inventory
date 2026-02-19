
import { getDetailedRegistrationStats, getInventoryFlowStats } from './src/lib/stats-actions';
import { getNaverOrderList } from './src/lib/naver/apis/orders';

async function test() {
    console.log('--- Testing DB Stats ---');
    try {
        const regStats = await getDetailedRegistrationStats();
        console.log('Detailed Reg Stats:', JSON.stringify(regStats, null, 2));

        const flowStats = await getInventoryFlowStats();
        console.log('Flow Stats (First 3):', JSON.stringify(flowStats.slice(0, 3), null, 2));
    } catch (e: any) {
        console.error('DB Stats Error:', e.message);
    }

    console.log('\n--- Testing Naver API ---');
    try {
        const orders = await getNaverOrderList(30);
        console.log('Naver Orders (Recent 30 Days):', orders ? (orders.data ? orders.data.length : 'No data prop') : 'Null response');
        if (orders && orders.data && orders.data.content) {
            console.log('Order Count:', orders.data.content.length);
        } else if (orders && orders.content) {
            console.log('Order Count:', orders.content.length);
        } else {
            console.log('Raw Response keys:', Object.keys(orders || {}));
        }
    } catch (e: any) {
        console.error('Naver API Error:', e.message);
    }
}

test();
