import bcrypt from 'bcryptjs';

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

// Workwear Archive hex ID (from seller center - DISPLAY_CATEGORY)
const WORKWEAR_HEX = '5e9079c077484a2ba3ae224b067e6a56';
// Military Archive hex ID
const MILITARY_HEX = '53641f64b7ed4f3e8b0b252c7d3fae18';

async function getToken() {
  const timestamp = Date.now();
  const hashed = bcrypt.hashSync(`${CLIENT_ID}_${timestamp}`, CLIENT_SECRET);
  const signature = Buffer.from(hashed, 'utf-8').toString('base64');
  const res = await fetch(`${PROXY_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
    body: JSON.stringify({
      client_id: CLIENT_ID, timestamp: timestamp.toString(),
      grant_type: 'client_credentials', client_secret_sign: signature, type: 'SELF'
    })
  });
  return (await res.json()).access_token;
}

function h(token) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY };
}

async function test() {
  const token = await getToken();
  console.log('[1] Token OK');

  // 판매중 상품 1개 가져오기
  const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
    method: 'POST', headers: h(token),
    body: JSON.stringify({ page: 1, size: 1, productStatusTypes: ['SALE'] })
  });
  const searchData = await searchRes.json();
  const product = searchData.contents?.[0];
  const prodNo = product?.originProductNo;
  console.log(`[2] Test product: ${prodNo} - ${(product?.name || '').slice(0, 60)}`);

  // 상세 조회
  const detailRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, { headers: h(token) });
  const detail = await detailRes.json();
  const ch = detail.smartstoreChannelProduct || {};

  // === TEST 1: hex 문자열로 전송 ===
  console.log('\n=== TEST 1: hex 문자열 (string) ===');
  const payload1 = {
    originProduct: detail.originProduct,
    smartstoreChannelProduct: {
      ...ch,
      storeChannelProductDisplayCategoryNoList: [WORKWEAR_HEX],
      channelProductDisplayCategoryNoList: [WORKWEAR_HEX]
    }
  };
  console.log('Sending:', [WORKWEAR_HEX]);
  const r1 = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, {
    method: 'PUT', headers: h(token), body: JSON.stringify(payload1)
  });
  console.log('Status:', r1.status);
  const d1 = await r1.json();
  console.log('Response ch:', JSON.stringify(d1.smartstoreChannelProduct, null, 2));

  // 2초 대기 후 확인
  await new Promise(r => setTimeout(r, 2000));

  // 확인
  const v1 = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, { headers: h(token) });
  const vd1 = await v1.json();
  console.log('\nAfter hex test - ch keys:', Object.keys(vd1.smartstoreChannelProduct || {}));

  // display 관련 필드 검색
  const findDisplayFields = (obj, prefix = '') => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes('display') || k.toLowerCase().includes('categ')) {
        console.log(`  ${prefix}${k} =`, JSON.stringify(v));
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) findDisplayFields(v, prefix + k + '.');
    }
  };
  findDisplayFields(vd1);

  // === TEST 2: 정수 468251로 비교 테스트 ===
  console.log('\n=== TEST 2: 정수 ID (468251) 비교 ===');
  const payload2 = {
    originProduct: detail.originProduct,
    smartstoreChannelProduct: {
      ...ch,
      storeChannelProductDisplayCategoryNoList: [468251],
      channelProductDisplayCategoryNoList: [468251]
    }
  };
  console.log('Sending:', [468251]);
  const r2 = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, {
    method: 'PUT', headers: h(token), body: JSON.stringify(payload2)
  });
  console.log('Status:', r2.status);
  const d2 = await r2.json();
  console.log('Response ch:', JSON.stringify(d2.smartstoreChannelProduct, null, 2));

  // === TEST 3: 빈 배열로 초기화 ===
  console.log('\n=== TEST 3: 빈 배열로 초기화 ===');
  const payload3 = {
    originProduct: detail.originProduct,
    smartstoreChannelProduct: {
      ...ch,
      storeChannelProductDisplayCategoryNoList: [],
      channelProductDisplayCategoryNoList: []
    }
  };
  const r3 = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, {
    method: 'PUT', headers: h(token), body: JSON.stringify(payload3)
  });
  console.log('Status:', r3.status);
  const d3 = await r3.json();
  console.log('Response ch:', JSON.stringify(d3.smartstoreChannelProduct, null, 2));

  console.log(`\n→ 스마트스토어에서 상품 ${prodNo}의 전시카테고리 확인 필요`);
  console.log('  TEST 1: hex ID → Workwear Archive에 들어갔는지');
  console.log('  TEST 2: 정수 468251 → MAN 가디건에 들어갔는지');
}

test().catch(e => console.error('Error:', e));
