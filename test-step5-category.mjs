// STEP 5: 카테고리 관리
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

async function main() {
  const token = await getToken();

  console.log('=== STEP 5-B: 네이버 카테고리 조회 ===\n');

  // 1. 전체 카테고리 가져오기
  const res = await fetch(`${PROXY_URL}/v1/categories`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('상태:', res.status);
  const categories = await res.json();
  console.log('총 카테고리 수:', categories.length);
  console.log('');

  // 2. 카테고리 구조 분석
  console.log('--- 첫 번째 카테고리 구조 ---');
  console.log(JSON.stringify(categories[0], null, 2));
  console.log('');

  // 3. 상품에 사용된 카테고리ID(50000836) 찾기
  const targetId = '50000836';
  const found = categories.find(c => String(c.id) === targetId || String(c.categoryId) === targetId);
  if (found) {
    console.log(`--- 카테고리 ${targetId} 정보 ---`);
    console.log(JSON.stringify(found, null, 2));
  } else {
    console.log(`카테고리 ${targetId} 직접 매칭 없음 - 필드명 확인 필요`);
    console.log('카테고리 키:', Object.keys(categories[0]));
  }
  console.log('');

  // 4. 대분류 카테고리 (depth 1 또는 parent 없음) 목록
  console.log('--- 대분류 카테고리 (상위 20개) ---');
  const topLevel = categories.filter(c =>
    !c.parentCategoryId || c.parentCategoryId === '0' || c.wholeCategoryName?.split('>').length === 1
  );
  console.log('대분류 개수:', topLevel.length);
  topLevel.slice(0, 20).forEach(c => {
    console.log(`  ${c.id || c.categoryId}: ${c.name || c.wholeCategoryName}`);
  });
  console.log('');

  // 5. "패션" 또는 "의류" 관련 카테고리 찾기
  const fashionCats = categories.filter(c => {
    const name = c.name || c.wholeCategoryName || '';
    return name.includes('패션') || name.includes('의류') || name.includes('데님') || name.includes('팬츠');
  });
  console.log('--- 패션/의류 관련 카테고리 (상위 20개) ---');
  console.log('개수:', fashionCats.length);
  fashionCats.slice(0, 20).forEach(c => {
    console.log(`  ${c.id || c.categoryId}: ${c.name || c.wholeCategoryName}`);
  });

  console.log('\n=== STEP 5-B 완료 ===');
}

main().catch(console.error);
