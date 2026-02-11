// STEP 2: 상품 조회 엔드포인트 찾기
import fetch from 'node-fetch';

const PROXY_URL = 'http://15.164.216.212:3001';
const CLIENT_ID = '7Sx7FdSvbiqzHzJK6y7KD';
const CLIENT_SECRET = '$2a$04$lGhHeyqRRFiNMw.A7fnheO';

async function getToken() {
  const response = await fetch(`${PROXY_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET })
  });
  const data = await response.json();
  return data.access_token;
}

async function testEndpoint(token, method, path, body = null) {
  const url = `${PROXY_URL}${path}`;
  console.log(`\n--- ${method} ${path} ---`);

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  console.log('상태:', response.status, response.statusText);

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('json')) {
    const data = await response.json();

    if (response.status === 200) {
      console.log('✅ 성공!');
      console.log('응답 키:', Object.keys(data));

      // 상품 배열 찾기
      const productArrayKey = Object.keys(data).find(key =>
        Array.isArray(data[key]) && data[key].length > 0
      );

      if (productArrayKey) {
        console.log(`\n상품 배열 키: "${productArrayKey}"`);
        console.log('상품 개수:', data[productArrayKey].length);
        console.log('첫 번째 상품 키:', Object.keys(data[productArrayKey][0]));
      }

      // totalCount 같은 필드 찾기
      const countKeys = Object.keys(data).filter(key =>
        key.toLowerCase().includes('total') || key.toLowerCase().includes('count')
      );
      if (countKeys.length > 0) {
        console.log('\n카운트 관련 필드:', countKeys.map(k => `${k}: ${data[k]}`));
      }

      console.log('\n응답 샘플 (500자):');
      console.log(JSON.stringify(data, null, 2).substring(0, 500));

      return data;
    } else {
      console.log('에러:', data.code, '-', data.message);
    }
  } else {
    const text = await response.text();
    console.log('응답 (텍스트):', text.substring(0, 200));
  }

  return null;
}

async function main() {
  const token = await getToken();
  console.log('토큰:', token.substring(0, 20) + '...\n');

  // v2 엔드포인트 테스트
  const endpointsToTest = [
    ['GET', '/v2/products'],
    ['GET', '/v2/products/origin-products'],
    ['GET', '/v2/products/channel-products'],
    ['POST', '/v2/products/search', { page: 0, size: 100 }],
    ['GET', '/v1/products'],
  ];

  for (const [method, path, body] of endpointsToTest) {
    const result = await testEndpoint(token, method, path, body);
    if (result) {
      console.log('\n✅ 올바른 엔드포인트를 찾았습니다!');
      break;
    }
  }
}

main();
