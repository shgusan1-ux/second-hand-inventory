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

    // 2. 상품 1개 검색 - 전체 데이터 반환
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

    console.log('=== 검색 API 전체 구조 (1레벨) ===');
    console.log('키:', Object.keys(product).join(', '));
    console.log('originProductNo:', product.originProductNo);

    // channelProducts 전체 출력
    if (product.channelProducts && product.channelProducts[0]) {
        const cp = product.channelProducts[0];
        console.log('\n=== channelProduct 키 ===');
        console.log(Object.keys(cp).join(', '));
        console.log('\n=== channelProduct 전체 ===');
        console.log(JSON.stringify(cp, null, 2).substring(0, 5000));
    }

    // 3. 상세 API의 전체 키 구조 확인
    const detailRes = await fetch(PROXY_URL + '/v2/products/origin-products/' + product.originProductNo, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY
        }
    });
    const detail = await detailRes.json();

    console.log('\n=== 상세 API 최상위 키 ===');
    console.log(Object.keys(detail).join(', '));

    // originProduct의 키도 확인
    if (detail.originProduct) {
        console.log('\n=== originProduct 키 ===');
        console.log(Object.keys(detail.originProduct).join(', '));
    }

    // 전체 detail 중 display/exhibition/category 관련 부분 검색
    const detailStr = JSON.stringify(detail);
    const patterns = ['display', 'Display', 'exhibition', 'Exhibition', 'categoryNo', 'CategoryNo'];
    console.log('\n=== detail에서 키워드 검색 ===');
    for (const p of patterns) {
        if (detailStr.includes(p)) {
            console.log(`"${p}" 발견!`);
            // 해당 키워드 주변 텍스트
            const idx = detailStr.indexOf(p);
            console.log('  컨텍스트:', detailStr.substring(Math.max(0, idx - 50), idx + 100));
        }
    }

    // 전체 상세 데이터의 첫 5000자
    console.log('\n=== 전체 detail (처음 5000자) ===');
    console.log(JSON.stringify(detail, null, 2).substring(0, 5000));
}
main().catch(e => console.error(e));
