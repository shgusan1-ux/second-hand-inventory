import { getNaverChannels, getOrdersSummary } from './src/lib/naver/apis/stats';

async function test() {
    try {
        console.log('--- Testing Channels ---');
        const channels = await getNaverChannels().catch(e => {
            console.error('Channel Error:', e.message);
            return [];
        });
        console.log('Channels found:', JSON.stringify(channels, null, 2));

        console.log('\n--- Testing Orders Summary ---');
        const summary = await getOrdersSummary(30).catch(e => {
            console.error('Orders summary Error:', e.message);
            return null;
        });
        console.log('Orders Summary:', JSON.stringify(summary, null, 2));

    } catch (e: any) {
        console.error('Global Error:', e.message);
    }
}

test();
