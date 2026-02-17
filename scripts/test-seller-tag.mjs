/**
 * sellerTags 태그 쓰기/읽기 테스트
 * 상품 12942482522에 BS-CLEARANCE 태그 추가 후 검색으로 확인
 */

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const PRODUCT_NO = 12942482522;
const TAG_TEXT = 'BS클리어런스';

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

async function main() {
    const token = await getToken();
    console.log('1. 토큰 발급:', token ? 'OK' : 'FAIL');

    // Step 1: 상품 상세 조회
    console.log(`\n2. 상품 ${PRODUCT_NO} 상세 조회...`);
    const detailRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${PRODUCT_NO}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY }
    });
    if (!detailRes.ok) {
        console.error('상세 조회 실패:', detailRes.status, await detailRes.text());
        return;
    }
    const detail = await detailRes.json();
    const productName = detail.originProduct?.name || 'Unknown';
    const currentTags = detail.originProduct?.detailAttribute?.seoInfo?.sellerTags || [];
    console.log(`   상품명: ${productName}`);
    console.log(`   현재 sellerTags:`, JSON.stringify(currentTags));

    // Step 2: BS-CLEARANCE 태그 추가
    const existingBSTags = currentTags.filter(t => !t.text?.startsWith('BS-'));
    const newTags = [...existingBSTags, { text: TAG_TEXT }];
    console.log(`\n3. 태그 추가: ${TAG_TEXT}`);
    console.log(`   새 sellerTags:`, JSON.stringify(newTags));

    // originProduct에 태그 반영
    detail.originProduct.detailAttribute.seoInfo.sellerTags = newTags;

    // Step 3: PUT 업데이트
    console.log('\n4. PUT 업데이트 실행...');
    const updatePayload = {
        originProduct: detail.originProduct,
        smartstoreChannelProduct: detail.smartstoreChannelProduct,
    };

    const putRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${PRODUCT_NO}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify(updatePayload),
    });

    if (!putRes.ok) {
        const errText = await putRes.text();
        console.error('   PUT 실패:', putRes.status, errText.substring(0, 500));
        return;
    }
    const putResult = await putRes.json();
    console.log('   PUT 성공!');

    // Step 4: 다시 조회해서 태그 확인
    console.log('\n5. 재조회로 태그 확인...');
    const verifyRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${PRODUCT_NO}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY }
    });
    const verifyDetail = await verifyRes.json();
    const verifiedTags = verifyDetail.originProduct?.detailAttribute?.seoInfo?.sellerTags || [];
    console.log(`   상세 API sellerTags:`, JSON.stringify(verifiedTags));

    // Step 5: 검색 API에서 태그 확인
    console.log('\n6. 검색 API에서 태그 확인...');
    const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
        body: JSON.stringify({
            page: 1,
            size: 5,
            productStatusTypes: ['SALE', 'OUTOFSTOCK', 'SUSPENSION'],
            searchKeyword: productName.substring(0, 20),
            searchType: 'PRODUCT_NAME',
        }),
    });
    const searchData = await searchRes.json();
    const found = searchData.contents?.find(p => p.originProductNo === PRODUCT_NO);
    if (found) {
        const searchTags = found.channelProducts?.[0]?.sellerTags || [];
        console.log(`   검색 결과 sellerTags:`, JSON.stringify(searchTags));
        const hasBSTag = searchTags.some(t => t.text === TAG_TEXT || t === TAG_TEXT);
        console.log(`   BS-CLEARANCE 태그 존재: ${hasBSTag ? 'YES' : 'NO'}`);
    } else {
        console.log('   검색에서 상품 못 찾음');
    }

    console.log('\n=== 테스트 완료 ===');
}

main().catch(console.error);
