// STEP 4: 상품 수정 테스트 (최소 변경 → 재조회 검증)
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

  console.log('=== STEP 4: 상품 수정 테스트 ===\n');

  // 1. 수정 전 상태 확인
  console.log('--- 1. 수정 전 상태 ---');
  const before = await getProduct(token, productNo);
  const op = before.originProduct;
  console.log('상품명:', op.name);
  console.log('판매가:', op.salePrice);
  console.log('재고:', op.stockQuantity);
  console.log('상태:', op.statusType);
  console.log('');

  // 2. 수정 요청 (상품명에 [TEST] 추가)
  const originalName = op.name;
  const newName = `[TEST] ${originalName}`;

  console.log('--- 2. 수정 요청 ---');
  console.log('변경: 상품명');
  console.log('  Before:', originalName);
  console.log('  After:', newName);
  console.log('');

  // PATCH 시도
  const patchEndpoints = [
    ['PATCH', `/v2/products/origin-products/${productNo}`],
    ['PUT', `/v2/products/origin-products/${productNo}`],
  ];

  let modifySuccess = false;

  for (const [method, path] of patchEndpoints) {
    console.log(`--- ${method} ${path} ---`);

    const payload = {
      originProduct: {
        name: newName
      }
    };

    console.log('Payload:', JSON.stringify(payload));

    const res = await fetch(`${PROXY_URL}${path}`, {
      method,
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
      modifySuccess = true;
      break;
    } else {
      console.log('에러:', data.code, '-', data.message);
      if (data.invalidInputs) console.log('invalidInputs:', JSON.stringify(data.invalidInputs));
      console.log('');
    }
  }

  if (!modifySuccess) {
    console.log('❌ 수정 실패 - 다른 방법 필요');
    return;
  }

  // 3. 수정 후 재조회
  console.log('\n--- 3. 수정 후 재조회 ---');
  const after = await getProduct(token, productNo);
  console.log('상품명:', after.originProduct.name);
  console.log('');

  if (after.originProduct.name === newName) {
    console.log('✅ 변경 반영 확인!');
  } else {
    console.log('⚠️  변경 미반영 (반영 지연 가능)');
  }

  // 4. 원래대로 복구
  console.log('\n--- 4. 원상 복구 ---');
  const restoreRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ originProduct: { name: originalName } })
  });

  console.log('복구 상태:', restoreRes.status);
  if (restoreRes.status === 200) {
    console.log('✅ 원래 이름으로 복구 완료!');
  }

  // 5. 최종 확인
  const final = await getProduct(token, productNo);
  console.log('최종 상품명:', final.originProduct.name);

  console.log('\n=== STEP 4 완료 ===');
}

main().catch(console.error);
