// STEP 4-2: 상품 수정 (전체 필드 포함)
import fetch from 'node-fetch';

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

async function getToken() {
  const res = await fetch(`${PROXY_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET })
  });
  return (await res.json()).access_token;
}

async function getProduct(token, productNo) {
  const res = await fetch(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
}

async function main() {
  const token = await getToken();
  const productNo = 13037118928;

  console.log('=== STEP 4: 상품 수정 (전체 필드 포함) ===\n');

  // 1. 현재 상품 전체 데이터 가져오기
  const current = await getProduct(token, productNo);
  const op = current.originProduct;
  const ch = current.smartstoreChannelProduct;

  console.log('수정 전 상품명:', op.name);
  console.log('');

  const originalName = op.name;
  const newName = `[TEST] ${originalName}`;

  // 2. 기존 데이터를 그대로 복사하고 name만 변경
  const payload = {
    originProduct: {
      ...op,
      name: newName
    }
  };

  // smartstoreChannelProduct도 포함
  if (ch) {
    payload.smartstoreChannelProduct = ch;
  }

  console.log('--- PUT /v2/products/origin-products/' + productNo + ' ---');
  console.log('변경: name만 변경 (나머지 필드 그대로)');
  console.log('  Before:', originalName);
  console.log('  After:', newName);
  console.log('');

  const res = await fetch(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('상태:', res.status, res.statusText);
  const data = await res.json();

  if (res.status === 200) {
    console.log('✅ 수정 성공!');
    console.log('응답:', JSON.stringify(data, null, 2).substring(0, 500));

    // 3. 재조회
    console.log('\n--- 재조회 ---');
    const after = await getProduct(token, productNo);
    console.log('수정 후 상품명:', after.originProduct.name);

    if (after.originProduct.name === newName) {
      console.log('✅ 변경 반영 확인!');
    }

    // 4. 원상 복구
    console.log('\n--- 원상 복구 ---');
    payload.originProduct.name = originalName;
    const restoreRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('복구 상태:', restoreRes.status);
    const final = await getProduct(token, productNo);
    console.log('최종 상품명:', final.originProduct.name);
    console.log('\n✅ STEP 4 완료!');

  } else {
    console.log('❌ 수정 실패');
    console.log('에러:', JSON.stringify(data, null, 2).substring(0, 1000));
  }
}

main().catch(console.error);
