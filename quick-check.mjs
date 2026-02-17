import bcrypt from 'bcryptjs';
const PROXY_URL = 'http://15.164.216.212:3001';
const PROXY_KEY = 'brownstreet-proxy-key';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';
const timestamp = Date.now();
const hashed = bcrypt.hashSync(`${CLIENT_ID}_${timestamp}`, CLIENT_SECRET);
const signature = Buffer.from(hashed, 'utf-8').toString('base64');
const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY },
  body: JSON.stringify({ client_id: CLIENT_ID, timestamp: timestamp.toString(), grant_type: 'client_credentials', client_secret_sign: signature, type: 'SELF' })
});
const token = (await tokenRes.json()).access_token;

// 추가 엔드포인트 시도 - 스토어 전시카테고리 관련
const endpoints = [
  '/v1/seller/store-categories',
  '/v2/seller/store-categories',
  '/v1/seller/display-categories',
  '/v2/seller/display-categories',
  '/v1/stores/display-categories',
  '/v2/stores/display-categories',
  '/v1/store-display/categories',
  '/v1/store/display/categories',
  '/v1/seller/categories',
  '/v2/seller/categories',
  '/v1/my-store/categories',
  '/v1/smartstore/categories',
  '/v2/smartstore/categories',
  '/v1/product-display-categories',
  '/v2/product-display-categories',
];

for (const path of endpoints) {
  const res = await fetch(`${PROXY_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'x-proxy-key': PROXY_KEY }
  });
  const icon = res.status === 200 ? 'HIT' : res.status;
  if (res.status === 200) {
    const body = await res.text();
    console.log(`★ ${path} → ${res.status}: ${body.slice(0, 500)}`);
  } else {
    console.log(`  ${path} → ${icon}`);
  }
}

// 전체 카테고리 조회 API에서 스토어 카테고리 포함 여부 확인
console.log('\n=== /v1/categories (처음 3개) ===');
const catRes = await fetch(`${PROXY_URL}/v1/categories`, {
  headers: { 'Authorization': `Bearer ${token}`, 'x-proxy-key': PROXY_KEY }
});
if (catRes.status === 200) {
  const cats = await catRes.json();
  console.log('Total categories:', Array.isArray(cats) ? cats.length : 'not array');
  if (Array.isArray(cats)) {
    // 468251 검색
    const found = cats.find(c => c.id === 468251 || c.categoryId === 468251 || c.no === 468251);
    console.log('Found 468251:', found ? JSON.stringify(found) : 'NOT FOUND');
    // ARCHIVE 검색
    const archiveCats = cats.filter(c =>
      (c.name || c.categoryName || '').toLowerCase().includes('archive') ||
      (c.name || c.categoryName || '').includes('아카이브')
    );
    console.log('Archive categories:', archiveCats.length, archiveCats.slice(0, 3).map(c => JSON.stringify(c)));
  }
}
