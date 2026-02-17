import bcrypt from 'bcryptjs';

const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

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

async function main() {
  const token = await getToken();
  console.log('Token OK\n');

  // MILITARY ARCHIVE에 있는 채널상품 ID
  const channelProductNo = 13038923699;

  // 1. 채널상품 상세 조회 시도
  console.log('=== 1. Channel product detail ===');
  const endpoints = [
    `/v2/products/channel-products/${channelProductNo}`,
    `/v1/products/channel-products/${channelProductNo}`,
    `/v2/channel-products/${channelProductNo}`,
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${PROXY_URL}${ep}`, { headers: h(token) });
    if (res.ok) {
      const data = await res.json();
      console.log(`✓ ${ep} → 200`);
      console.log(JSON.stringify(data, null, 2).slice(0, 3000));
      // display 관련 필드 찾기
      const json = JSON.stringify(data);
      for (const key of ['display', 'categ', 'category', 'No']) {
        let idx = 0;
        while (true) {
          idx = json.indexOf(key, idx);
          if (idx === -1) break;
          // 키 이름 추출
          const start = json.lastIndexOf('"', idx);
          const end = json.indexOf('"', idx);
          if (start > -1 && end > -1) {
            const keyName = json.slice(start, end + 1);
            if (keyName.toLowerCase().includes('display') || keyName.toLowerCase().includes('categ')) {
              console.log(`  KEY: ${keyName} near: ${json.slice(idx, idx + 100)}`);
            }
          }
          idx += key.length;
        }
      }
    } else {
      console.log(`  ${ep} → ${res.status}`);
    }
  }

  // 2. 상품 검색에서 originProductNo 찾기
  console.log('\n=== 2. Search for products in MILITARY ARCHIVE ===');
  // 채널상품번호로 검색
  const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
    method: 'POST', headers: h(token),
    body: JSON.stringify({
      page: 1, size: 5,
      channelProductNos: [channelProductNo]
    })
  });
  if (searchRes.ok) {
    const data = await searchRes.json();
    console.log('Search by channelProductNo:', JSON.stringify(data, null, 2).slice(0, 2000));
  }

  // 3. origin product 상세 조회 (전체 응답)
  console.log('\n=== 3. Full origin product detail ===');
  // 먼저 검색으로 originProductNo 찾기
  const searchRes2 = await fetch(`${PROXY_URL}/v1/products/search`, {
    method: 'POST', headers: h(token),
    body: JSON.stringify({ page: 1, size: 3, productStatusTypes: ['SALE'] })
  });
  const products = (await searchRes2.json()).contents || [];
  if (products.length > 0) {
    const prodNo = products[0].originProductNo;
    const detailRes = await fetch(`${PROXY_URL}/v2/products/origin-products/${prodNo}`, { headers: h(token) });
    const detail = await detailRes.json();

    // 전체 응답 키 나열 (중첩)
    function listAllKeys(obj, prefix = '', depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 4) return;
      for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        const type = Array.isArray(v) ? `array[${v.length}]` : typeof v;
        if (k.toLowerCase().includes('display') || k.toLowerCase().includes('categ') || k.toLowerCase().includes('store')) {
          console.log(`  ${p}: ${type} = ${JSON.stringify(v).slice(0, 200)}`);
        }
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          listAllKeys(v, p, depth + 1);
        }
      }
    }
    console.log(`Product ${prodNo} - all display/category/store keys:`);
    listAllKeys(detail);
  }

  // 4. 스토어 전시카테고리 관련 엔드포인트 추가 시도
  console.log('\n=== 4. Additional endpoints ===');
  const channelNo = 102797712;
  const additionalEndpoints = [
    `/v2/channels/${channelNo}/display-categories`,
    `/v1/channels/${channelNo}/display-categories`,
    `/v2/channels/${channelNo}/store-categories`,
    `/v1/channels/${channelNo}/store-categories`,
    `/v2/channels/${channelNo}/categories`,
    `/v1/channels/${channelNo}/categories`,
    `/v2/display-categories`,
    `/v1/display-categories`,
    `/v2/store-categories`,
    `/v1/store-categories`,
  ];

  for (const ep of additionalEndpoints) {
    const res = await fetch(`${PROXY_URL}${ep}`, { headers: h(token) });
    const icon = res.status === 200 ? '✓' : ' ';
    if (res.ok) {
      const body = await res.text();
      console.log(`${icon} ${ep} → ${res.status}: ${body.slice(0, 500)}`);
    } else {
      console.log(`  ${ep} → ${res.status}`);
    }
  }
}

main().catch(e => console.error('Fatal:', e));
