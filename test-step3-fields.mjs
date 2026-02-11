// STEP 3-2: 상품 상세 필드 분석
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
  const productNo = 13037118928;

  const res = await fetch(`${PROXY_URL}/v2/products/origin-products/${productNo}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await res.json();
  const op = data.originProduct;
  const ch = data.smartstoreChannelProduct;

  console.log('=== STEP 3: 상품 상세 필드 분석 ===\n');

  // 1. 기본 정보
  console.log('📋 기본 정보');
  console.log('  상품명:', op.name);
  console.log('  상태:', op.statusType);
  console.log('  판매타입:', op.saleType);
  console.log('  카테고리ID:', op.leafCategoryId);
  console.log('');

  // 2. 가격/재고
  console.log('💰 가격/재고');
  console.log('  판매가:', op.salePrice);
  console.log('  재고:', op.stockQuantity);
  console.log('  할인:', JSON.stringify(op.customerBenefit));
  console.log('');

  // 3. 옵션
  console.log('🎨 옵션');
  if (op.optionInfo) {
    console.log('  옵션 구조:', JSON.stringify(op.optionInfo, null, 2).substring(0, 1000));
  } else {
    console.log('  옵션 없음');
  }
  console.log('');

  // 4. 이미지
  console.log('🖼️  이미지');
  if (op.images) {
    console.log('  대표이미지:', op.images.representativeImage?.url?.substring(0, 80));
    console.log('  추가이미지 수:', op.images.optionalImages?.length || 0);
  }
  console.log('');

  // 5. 배송
  console.log('🚚 배송');
  if (op.deliveryInfo) {
    console.log('  배송비타입:', op.deliveryInfo.deliveryFee?.deliveryFeeType);
    console.log('  배송비:', op.deliveryInfo.deliveryFee?.baseFee);
  }
  console.log('');

  // 6. 채널(스마트스토어) 정보
  console.log('🏪 스마트스토어 채널');
  if (ch) {
    console.log('  channelProductNo:', ch.channelProductNo);
    console.log('  storeChannelId:', ch.storeChannelId);
    console.log('  채널 전체 키:', Object.keys(ch));
  }
  console.log('');

  // 7. originProduct 전체 키 목록
  console.log('📦 originProduct 전체 키:');
  console.log(' ', Object.keys(op).join(', '));
  console.log('');

  // 8. 전체 JSON 저장용 출력
  console.log('=== 전체 JSON (5000자) ===');
  console.log(JSON.stringify(data, null, 2).substring(0, 5000));
}

main().catch(console.error);
