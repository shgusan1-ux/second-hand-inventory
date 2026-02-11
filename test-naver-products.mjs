// STEP 2: Naver Commerce API 상품 목록 조회
import fetch from 'node-fetch';

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

// STEP 1: 토큰 발급
async function getToken() {
  const response = await fetch(`${PROXY_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });

  const data = await response.json();
  if (response.status === 200 && data.access_token) {
    return data.access_token;
  }
  throw new Error(`토큰 발급 실패: ${JSON.stringify(data)}`);
}

// STEP 2-1: 상품 목록 조회
async function getProducts(token, page = 1, size = 100) {
  console.log(`\n=== 상품 목록 조회 (페이지 ${page}, 사이즈 ${size}) ===\n`);

  // Naver Commerce API 상품 조회 엔드포인트
  // 공식 문서: https://apicenter.commerce.naver.com/docs/commerce-api/current/상품
  const url = `${PROXY_URL}/v1/products/origin-products`;

  console.log('요청 URL:', url);
  console.log('Authorization:', `Bearer ${token.substring(0, 20)}...`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('응답 상태:', response.status, response.statusText);

    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    console.log('');

    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.log('응답 (텍스트):', text.substring(0, 500));
      return null;
    }

    const data = await response.json();

    if (response.status === 200) {
      console.log('✅ 상품 목록 조회 성공!\n');

      // 응답 구조 분석
      console.log('응답 구조:');
      console.log('- data 타입:', Array.isArray(data) ? 'Array' : typeof data);

      if (data.data) {
        console.log('- data.data 타입:', Array.isArray(data.data) ? 'Array' : typeof data.data);
        console.log('- data.data 길이:', data.data?.length);
      }

      if (data.contents) {
        console.log('- data.contents 타입:', Array.isArray(data.contents) ? 'Array' : typeof data.data);
        console.log('- data.contents 길이:', data.contents?.length);
      }

      if (data.totalElements !== undefined) {
        console.log('- totalElements:', data.totalElements);
      }

      if (data.totalCount !== undefined) {
        console.log('- totalCount:', data.totalCount);
      }

      console.log('\n전체 응답 키:', Object.keys(data));
      console.log('\n응답 샘플 (처음 1000자):');
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));

      return data;
    } else {
      console.log('❌ 상품 목록 조회 실패\n');
      console.log('응답:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ 요청 중 오류:', error.message);
    return null;
  }
}

// 실행
async function main() {
  try {
    console.log('=== STEP 2: 상품 목록 조회 테스트 ===');

    const token = await getToken();
    console.log('✅ 토큰 발급 완료:', token.substring(0, 20) + '...');

    const products = await getProducts(token);

    if (!products) {
      console.log('\n⚠️  다른 엔드포인트를 시도합니다...');

      // 대체 엔드포인트들 시도
      const alternativeEndpoints = [
        '/v1/products/channel-products',
        '/v1/products/search',
        '/v1/products'
      ];

      for (const endpoint of alternativeEndpoints) {
        console.log(`\n--- 시도: ${endpoint} ---`);
        const url = `${PROXY_URL}${endpoint}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('상태:', response.status);
        const text = await response.text();
        console.log('응답:', text.substring(0, 500));
      }
    }

  } catch (error) {
    console.error('실행 중 오류:', error.message);
  }
}

main();
