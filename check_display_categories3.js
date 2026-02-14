const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';

async function main() {
    // 1. 토큰 발급
    const tokenRes = await fetch(PROXY_URL + '/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            client_id: process.env.NAVER_CLIENT_ID,
            client_secret: process.env.NAVER_CLIENT_SECRET,
            grant_type: 'client_credentials'
        })
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    console.log('Token OK');

    // 2. 상품 1개 검색
    const searchRes = await fetch(PROXY_URL + '/v1/products/search', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        },
        body: JSON.stringify({ page: 1, size: 1, productStatusTypes: ['SALE'] })
    });
    const searchData = await searchRes.json();
    const product = searchData.contents && searchData.contents[0];
    if (!product) { console.log('상품 없음'); return; }

    const channelProductNo = product.channelProducts[0].channelProductNo;
    const originProductNo = product.originProductNo;
    console.log('originProductNo:', originProductNo);
    console.log('channelProductNo:', channelProductNo);

    // 3. 다양한 전시 카테고리 관련 API 시도
    const endpoints = [
        // 네이버 Commerce API 채널 전시 카테고리
        `/v1/channel-products/${channelProductNo}/display-categories`,
        // 스토어 전시 카테고리 목록
        `/v1/display-categories`,
        // 채널 상품 상세 (v1)
        `/v1/products/origin-products/${originProductNo}`,
        // 채널 전시 카테고리 (다른 형식)
        `/v2/products/origin-products/${originProductNo}/channel-products`,
    ];

    for (const endpoint of endpoints) {
        try {
            console.log('\n--- 시도:', endpoint, '---');
            const res = await fetch(PROXY_URL + endpoint, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'x-proxy-key': PROXY_KEY
                }
            });
            const text = await res.text();
            console.log('Status:', res.status);
            if (text.length < 3000) {
                console.log('Response:', text);
            } else {
                // display 관련 키워드 검색
                const data = JSON.parse(text);
                const str = JSON.stringify(data);
                if (str.includes('display') || str.includes('Display') || str.includes('exhibition') || str.includes('category')) {
                    console.log('display/category 키워드 발견');
                    // 첫 2000자만
                    console.log(JSON.stringify(data, null, 2).substring(0, 2000));
                } else {
                    console.log('Response keys:', typeof data === 'object' ? Object.keys(data).join(', ') : 'N/A');
                }
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
    }

    // 4. 스토어 전시 카테고리 (store display categories) - 스토어 자체 카테고리 목록
    try {
        console.log('\n--- 시도: /v1/store/display-categories ---');
        const res = await fetch(PROXY_URL + '/v1/store/display-categories', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-proxy-key': PROXY_KEY
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text.substring(0, 3000));
    } catch (e) {
        console.log('Error:', e.message);
    }

    // 5. 전시 카테고리 기반 상품 조회
    try {
        console.log('\n--- 시도: /v1/channel/display-categories ---');
        const res = await fetch(PROXY_URL + '/v1/channel/display-categories', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-proxy-key': PROXY_KEY
            }
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text.substring(0, 3000));
    } catch (e) {
        console.log('Error:', e.message);
    }
}
main().catch(e => console.error(e));
