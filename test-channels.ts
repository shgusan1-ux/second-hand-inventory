import { getNaverChannels } from './src/lib/naver/apis/stats';

async function test() {
    try {
        console.log('Fetching channels...');
        const channels = await getNaverChannels();
        console.log('Channels found:', JSON.stringify(channels, null, 2));
    } catch (e: any) {
        console.error('Error fetching channels:', e.message);
    }
}

test();
