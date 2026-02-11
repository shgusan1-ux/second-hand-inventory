// STEP 2: 상품 검색 API 테스트 (POST /v1/products/search)
import fetch from 'node-fetch';

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

async function main() {
  console.log('=== STEP 2: 상품 목록 조회 (POST /v1/products/search) ===\n');

  // 1. 토큰 발급
  const tokenRes = await fetch(`${PROXY_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('❌ 토큰 발급 실패:', tokenData);
    return;
  }

  const token = tokenData.access_token;
  console.log('✅ 토큰 발급 성공:', token.substring(0, 20) + '...\n');

  // 2. 상품 검색
  console.log('--- POST /v1/products/search ---');
  console.log('요청 Body: { page: 0, size: 100 }\n');

  const searchRes = await fetch(`${PROXY_URL}/v1/products/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ page: 0, size: 100 })
  });

  console.log('응답 상태:', searchRes.status, searchRes.statusText);

  const searchData = await searchRes.json();

  if (searchRes.status === 200) {
    console.log('\n✅ 상품 조회 성공!\n');

    // 응답 구조 분석
    console.log('응답 최상위 키:', Object.keys(searchData));

    // 상품 배열 찾기
    let products = [];
    let totalCount = 0;

    if (Array.isArray(searchData)) {
      products = searchData;
      totalCount = searchData.length;
      console.log('\n상품 데이터: 배열 형태');
    } else if (searchData.data) {
      products = searchData.data;
      totalCount = searchData.totalCount || searchData.data.length;
      console.log('\n상품 데이터: searchData.data');
    } else if (searchData.contents) {
      products = searchData.contents;
      totalCount = searchData.totalElements || searchData.totalCount || searchData.contents.length;
      console.log('\n상품 데이터: searchData.contents');
    }

    console.log('이번 페이지 상품 개수:', products.length);
    console.log('총 상품 개수:', totalCount);

    if (products.length > 0) {
      console.log('\n첫 번째 상품 필드:', Object.keys(products[0]));
      console.log('\n첫 번째 상품 샘플:');
      console.log(JSON.stringify(products[0], null, 2).substring(0, 800));
    }

    // 페이징 정보
    if (searchData.page !== undefined) console.log('\npage:', searchData.page);
    if (searchData.size !== undefined) console.log('size:', searchData.size);
    if (searchData.totalPages !== undefined) console.log('totalPages:', searchData.totalPages);

    console.log('\n=== STEP 2 완료 ===');
    console.log(`\n✅ 총 상품 개수: ${totalCount}개`);
    console.log(`✅ 이번 조회: ${products.length}개`);

  } else {
    console.log('\n❌ 상품 조회 실패\n');
    console.log('에러 응답:', JSON.stringify(searchData, null, 2));
  }
}

main().catch(console.error);
