import bcrypt from 'bcryptjs';
const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

async function getToken() {
  const ts = Date.now();
  const hashed = bcrypt.hashSync(`${CLIENT_ID}_${ts}`, CLIENT_SECRET);
  const sig = Buffer.from(hashed, 'utf-8').toString('base64');
  const res = await fetch(`${PROXY_URL}/oauth/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
    body: JSON.stringify({ client_id: CLIENT_ID, timestamp: ts.toString(), grant_type: 'client_credentials', client_secret_sign: sig, type: 'SELF' })
  });
  return (await res.json()).access_token;
}
const h = (t) => ({ 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY });

async function main() {
  const token = await getToken();

  // MILITARY ARCHIVE 에 있는 채널상품
  const channelProductNo = 13038923699;

  // 1. /v2/products/channel-products/{no} - 전체 응답 분석 (detailContent 제외)
  console.log('=== /v2/products/channel-products/' + channelProductNo + ' ===');
  const res = await fetch(`${PROXY_URL}/v2/products/channel-products/${channelProductNo}`, { headers: h(token) });
  const data = await res.json();

  // detailContent 제거 (너무 김)
  if (data.originProduct) delete data.originProduct.detailContent;

  // 전체 키 나열 (4레벨까지)
  function listAll(obj, prefix = '', depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 4) return;
    if (Array.isArray(obj)) {
      console.log(`${prefix}: array[${obj.length}]`);
      if (obj.length > 0 && typeof obj[0] === 'object') {
        listAll(obj[0], `${prefix}[0]`, depth + 1);
      } else if (obj.length > 0) {
        console.log(`${prefix}[0]: ${typeof obj[0]} = ${JSON.stringify(obj[0])}`);
      }
      return;
    }
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      if (v === null || v === undefined) {
        console.log(`${p}: null`);
      } else if (typeof v === 'object') {
        listAll(v, p, depth + 1);
      } else {
        console.log(`${p}: ${typeof v} = ${JSON.stringify(v).slice(0, 200)}`);
      }
    }
  }

  console.log('\n--- 전체 필드 목록 ---');
  listAll(data);

  // 2. 다른 상품도 확인 (일반 판매중 상품)
  console.log('\n\n=== 일반 판매중 상품 원상품 상세 ===');
  const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
    method: 'POST', headers: h(token),
    body: JSON.stringify({ page: 1, size: 1, productStatusTypes: ['SALE'] })
  });
  const p = (await searchRes.json()).contents?.[0];
  if (p) {
    const d = await fetch(`${PROXY_URL}/v2/products/origin-products/${p.originProductNo}`, { headers: h(token) });
    const detail = await d.json();
    if (detail.originProduct) delete detail.originProduct.detailContent;
    console.log('\n--- 전체 필드 목록 ---');
    listAll(detail);
  }
}

main().catch(e => console.error(e));
