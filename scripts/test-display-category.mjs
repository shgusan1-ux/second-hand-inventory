/**
 * 전시카테고리 전송 디버깅
 */

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const NEW_CATEGORY_ID = 'bedf1e439281477fb6383cfb1770eea9';

async function getToken() {
    const res = await fetch(`${PROXY_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            client_id: '7Sx7FdSvbiqzHzJK6y7KD',
            client_secret: '$2a$04$lGhHeyqRRFiNMw.A7fnheO',
            grant_type: 'client_credentials'
        }),
    });
    const data = await res.json();
    return data.access_token;
}

async function naverAPI(token, method, path, body) {
    const url = `${PROXY_URL}${path}`;
    const opts = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-proxy-key': PROXY_KEY,
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    try { return { status: res.status, data: JSON.parse(text) }; }
    catch { return { status: res.status, data: text }; }
}

function findFields(obj, path = '', target) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${k}` : k;
        const keyLower = k.toLowerCase();
        if (keyLower.includes('display') || keyLower.includes('categor')) {
            console.log(`  ${fullPath} = ${JSON.stringify(v).substring(0, 200)}`);
        }
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            findFields(v, fullPath, target);
        }
    }
}

async function main() {
    const token = await getToken();
    console.log('1. 토큰:', token ? 'OK' : 'FAIL');

    // 검색 결과 구조 확인
    const searchRes = await naverAPI(token, 'POST', '/v1/products/search', {
        filter: { statusType: 'SALE' },
        page: 1,
        size: 1,
    });

    const product = searchRes.data?.contents?.[0];
    if (!product) { console.log('상품 없음'); return; }

    const productNo = product.originProductNo;
    console.log(`\n2. 상품: ${productNo}`);
    console.log('\n=== 검색결과 display/category 필드 ===');
    findFields(product);

    if (product.channelProducts) {
        console.log('\n=== channelProducts ===');
        for (const cp of product.channelProducts) {
            console.log(JSON.stringify(cp, null, 2));
        }
    }

    // 상세 조회
    const detailRes = await naverAPI(token, 'GET', `/v2/products/origin-products/${productNo}`);
    const detail = detailRes.data;
    console.log('\n=== 상세조회 display/category 필드 ===');
    findFields(detail);

    // smartstoreChannelProduct 전체 출력
    console.log('\n=== smartstoreChannelProduct 전체 ===');
    console.log(JSON.stringify(detail.smartstoreChannelProduct, null, 2));

    // 테스트: channelProductDisplayCategoryNoList에 숫자 넣어보기
    console.log('\n\n=== 테스트 A: UUID 문자열로 전시카테고리 전송 ===');
    const payloadA = {
        originProduct: detail.originProduct,
        smartstoreChannelProduct: {
            ...detail.smartstoreChannelProduct,
            channelProductDisplayCategoryNoList: [NEW_CATEGORY_ID],
        }
    };
    const resA = await naverAPI(token, 'PUT', `/v2/products/origin-products/${productNo}`, payloadA);
    console.log('결과A:', resA.status);
    if (resA.status !== 200) console.log(JSON.stringify(resA.data));

    // 검증: 다시 조회
    const afterA = await naverAPI(token, 'GET', `/v2/products/origin-products/${productNo}`);
    console.log('조회A channelProductDisplayCategoryNoList:', afterA.data?.smartstoreChannelProduct?.channelProductDisplayCategoryNoList);

    // 테스트 B: 빈 배열로 전송
    console.log('\n=== 테스트 B: 빈 배열로 전시카테고리 전송 ===');
    const payloadB = {
        originProduct: detail.originProduct,
        smartstoreChannelProduct: {
            ...detail.smartstoreChannelProduct,
            channelProductDisplayCategoryNoList: [],
        }
    };
    const resB = await naverAPI(token, 'PUT', `/v2/products/origin-products/${productNo}`, payloadB);
    console.log('결과B:', resB.status);
    if (resB.status !== 200) console.log(JSON.stringify(resB.data));

    // 테스트 C: channelProductDisplayCategoryNoList 없이 전송
    console.log('\n=== 테스트 C: channelProductDisplayCategoryNoList 필드 제외하고 전송 ===');
    const payloadC = {
        originProduct: detail.originProduct,
        smartstoreChannelProduct: {
            channelProductDisplayStatusType: detail.smartstoreChannelProduct.channelProductDisplayStatusType,
            naverShoppingRegistration: detail.smartstoreChannelProduct.naverShoppingRegistration,
        }
    };
    const resC = await naverAPI(token, 'PUT', `/v2/products/origin-products/${productNo}`, payloadC);
    console.log('결과C:', resC.status);
    if (resC.status !== 200) console.log(JSON.stringify(resC.data));
}

main().catch(console.error);
