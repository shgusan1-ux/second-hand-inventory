const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';

async function getToken() {
    const res = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({ client_id: '7Sx7FdSvbiqzHzJK6y7KD', client_secret: '$2a$04$lGhHeyqRRFiNMw.A7fnheO', grant_type: 'client_credentials' }),
    });
    return (await res.json()).access_token;
}

async function main() {
    const token = await getToken();

    // 검색에서 첫 상품
    const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({ filter: { statusType: 'SALE' }, page: 1, size: 1 }),
    });
    const searchData = await searchRes.json();
    const first = searchData.contents[0];
    const prodNo = first.originProductNo;
    console.log('상품번호:', prodNo);

    // 상세조회
    const detailRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY },
    });
    console.log('상세조회 status:', detailRes.status);
    const detail = await detailRes.json();
    console.log('최상위 키:', Object.keys(detail));

    if (detail.smartstoreChannelProduct) {
        console.log('\n=== smartstoreChannelProduct ===');
        console.log(JSON.stringify(detail.smartstoreChannelProduct, null, 2));
    } else {
        console.log('\nsmartstore 관련 키 없음. 전체 키 확인:');
        for (const k of Object.keys(detail)) {
            const val = detail[k];
            if (val !== null && typeof val === 'object') {
                console.log(` - ${k}: (object, keys: ${Object.keys(val).slice(0, 5).join(', ')}...)`);
            } else {
                console.log(` - ${k}: ${typeof val}`);
            }
        }
    }
}

main().catch(console.error);
