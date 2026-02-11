import { getNaverToken, searchProducts } from './src/lib/naver/client.ts';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyLive() {
    console.log('--- Live Cross-Verification Start ---');
    try {
        console.log('1. Attempting Token Acquisition...');
        const tokenData = await getNaverToken();
        console.log('✅ Token received:', tokenData.access_token.substring(0, 15) + '...');

        console.log('\n2. Attempting Product Search (Live)...');
        const searchData = await searchProducts(tokenData.access_token, 0, 5);
        console.log('✅ Search Success! Items found:', searchData.contents?.length || 0);
        console.log('Total Elements in Store:', searchData.totalElements);

        if (searchData.contents && searchData.contents.length > 0) {
            console.log('\n3. Sample Product data check:');
            const first = searchData.contents[0];
            console.log('Product Name:', first.channelProducts?.[0]?.name);
            console.log('Product No:', first.originProductNo);
        }

        console.log('\n--- Conclusion: API Integration is FULLY FUNCTIONAL ---');
    } catch (error) {
        console.error('\n❌ Verification Failed:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

verifyLive();
