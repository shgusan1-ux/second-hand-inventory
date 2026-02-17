import bcrypt from 'bcryptjs';

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

// 정수형 전시카테고리 ID (PlayAuto에서 확인)
const TEST_CATEGORY_ID = 468251; // "MAN : 가디건"

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
  const data = await res.json();
  if (!data.access_token) throw new Error('Token failed');
  return data.access_token;
}

function h(token) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY };
}

async function test() {
  const token = await getToken();
  console.log('[1] Token OK');

  // 판매중 상품 1개
  const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
    method: 'POST', headers: h(token),
    body: JSON.stringify({ page: 1, size: 3, productStatusTypes: ['SALE'] })
  });
  const searchData = await searchRes.json();

  for (const p of searchData.contents || []) {
    console.log(`  - ${p.originProductNo}: ${(p.name || '').slice(0, 60)}`);
  }

  const product = searchData.contents?.[0];
  const prodNo = product?.originProductNo;
  console.log(`\n[2] Test product: ${prodNo} - ${(product?.name || '').slice(0, 60)}`);

  // 상세 조회
  const detailRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, { headers: h(token) });
  const detail = await detailRes.json();
  const ch = detail.smartstoreChannelProduct || {};

  console.log('[3] Before - ch keys:', Object.keys(ch));

  // === 정수 ID로 전시카테고리 전송 ===
  console.log(`\n[4] === 정수 ID로 전시카테고리 전송 (${TEST_CATEGORY_ID} = MAN:가디건) ===`);

  const payload = {
    originProduct: detail.originProduct,
    smartstoreChannelProduct: {
      ...ch,
      storeChannelProductDisplayCategoryNoList: [TEST_CATEGORY_ID],
      channelProductDisplayCategoryNoList: [TEST_CATEGORY_ID]
    }
  };

  console.log('Sending storeChannelProductDisplayCategoryNoList:', [TEST_CATEGORY_ID]);
  console.log('Sending channelProductDisplayCategoryNoList:', [TEST_CATEGORY_ID]);

  const updateRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, {
    method: 'PUT', headers: h(token),
    body: JSON.stringify(payload)
  });

  console.log('PUT Status:', updateRes.status);
  const updateData = await updateRes.json();
  const cpNo = updateData.smartstoreChannelProductNo;
  console.log('channelProductNo:', cpNo);
  console.log('PUT response ch:', JSON.stringify(updateData.smartstoreChannelProduct, null, 2));

  // 확인
  await new Promise(r => setTimeout(r, 2000));
  const verifyRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, { headers: h(token) });
  const verifyData = await verifyRes.json();
  const vCh = verifyData.smartstoreChannelProduct || {};
  console.log('\n[5] After - ch keys:', Object.keys(vCh));
  console.log('After - full ch:', JSON.stringify(vCh, null, 2));

  // display 관련 키 찾기
  const findKeys = (obj, prefix = '') => {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes('display') || k.toLowerCase().includes('categ')) {
        console.log(`  FOUND: ${prefix}${k} =`, JSON.stringify(v));
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) findKeys(v, prefix + k + '.');
    }
  };
  findKeys(verifyData);

  console.log('\n→ 스마트스토어 관리자에서 이 상품의 전시카테고리를 직접 확인해주세요!');
  console.log(`  상품번호: ${prodNo}`);
  console.log(`  상품명: ${product?.name}`);
  console.log(`  기대 카테고리: MAN > 가디건 (ID: ${TEST_CATEGORY_ID})`);
}

test().catch(e => console.error('Error:', e.message));
