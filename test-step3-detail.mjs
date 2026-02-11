// STEP 3: 특정 상품 상세 조회
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
  console.log('토큰 발급 완료\n');

  const productNo = 13037118928; // STEP2에서 확인된 첫 번째 상품

  // 상세 조회 엔드포인트 후보 테스트
  const endpoints = [
    `GET /v2/products/origin-products/${productNo}`,
    `GET /v1/products/origin-products/${productNo}`,
    `GET /v2/products/${productNo}`,
  ];

  for (const ep of endpoints) {
    const [method, path] = ep.split(' ');
    console.log(`--- ${ep} ---`);

    const res = await fetch(`${PROXY_URL}${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('상태:', res.status);
    const data = await res.json();

    if (res.status === 200) {
      console.log('\n✅ 상세 조회 성공!\n');
      console.log('최상위 키:', Object.keys(data));

      // 주요 필드 출력
      const p = data.originProduct || data;
      const name = p.name || p.originProduct?.name;
      const detail = p.detailContent || p.originProduct?.detailContent;

      console.log('\n=== 상품 기본 정보 ===');
      console.log(JSON.stringify(data, null, 2).substring(0, 3000));

      console.log('\n\n=== 상세설명 (처음 300자) ===');
      if (detail) {
        console.log(detail.substring(0, 300));
      } else {
        console.log('detailContent 필드 없음 - 응답 구조 확인 필요');
      }

      return;
    } else {
      console.log('에러:', data.code, '-', data.message);
      console.log('');
    }
  }

  console.log('❌ 모든 엔드포인트 실패');
}

main().catch(console.error);
