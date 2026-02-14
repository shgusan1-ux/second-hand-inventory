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

    console.log('상품번호:', product.originProductNo);
    console.log('exhibitionCategoryIds:', JSON.stringify(product.exhibitionCategoryIds));

    // 3. 상세 조회
    const detailRes = await fetch(PROXY_URL + '/v2/products/origin-products/' + product.originProductNo, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        }
    });
    const detail = await detailRes.json();

    const ch = detail.smartstoreChannelProduct || {};
    console.log('\n=== smartstoreChannelProduct 키 ===');
    console.log(Object.keys(ch).join(', '));

    console.log('\n=== 전시 카테고리 관련 ===');
    console.log('channelProductDisplayCategoryNoList:', JSON.stringify(ch.channelProductDisplayCategoryNoList));
    console.log('storeChannelProductDisplayCategoryNoList:', JSON.stringify(ch.storeChannelProductDisplayCategoryNoList));
    console.log('naviDisplay:', ch.naviDisplay);
    console.log('channelProductDisplayStatusType:', ch.channelProductDisplayStatusType);

    // 전체 구조 확인
    console.log('\n=== 전체 smartstoreChannelProduct ===');
    console.log(JSON.stringify(ch, null, 2).substring(0, 3000));
}
main().catch(e => console.error(e));
