# NAVER Commerce API 학습 로그 (2026-02-11)

## 1. 개요
NAVER 커머스 API를 통한 상품 등록 및 관리 체계 학습 결과.

## 2. 검증 완료 API 엔드포인트

### 인증
*   **토큰 발급**: `POST /oauth/token` → 프록시가 `/external/v1/oauth2/token`으로 전달
    - 요청: `{ client_id, client_secret }` (프록시에서 bcrypt 서명 생성)
    - 응답: `{ access_token, expires_in: 10799, token_type: "Bearer" }`

### 상품 관리
*   **상품 목록 검색**: `POST /v1/products/search` ✅ (1,017개 확인)
    - 요청: `{ page: 0, size: 100 }`
    - 응답: `{ contents[], totalElements, totalPages, page, size }`
*   **상품 상세 조회**: `GET /v2/products/origin-products/{originProductNo}` ✅
    - 응답: `{ originProduct, smartstoreChannelProduct }`
*   **상품 수정**: `PUT /v2/products/origin-products/{originProductNo}` ✅
    - 요청: 기존 전체 데이터 + 변경 필드 (PATCH 아닌 PUT, 전체 교체)
    - 필수: `originProduct.statusType` 포함해야 함
*   **상품 등록**: `POST /v2/products` (미검증)

### 카테고리
*   **카테고리 전체 조회**: `GET /v1/categories` ✅ (5,804개)
    - 응답: `[{ id, name, wholeCategoryName, last }]`
    - 예: `{ id: "50000836", name: "바지", wholeCategoryName: "패션의류>남성의류>바지" }`

### 이미지
*   **이미지 업로드**: 상품 등록 전에 이미지를 먼저 업로드하여 반환받은 URL을 사용해야 함.

## 3. 검증된 데이터 구조

### 상품 목록 (contents[])
```json
{
  "originProductNo": 13037118928,
  "channelProducts": [{
    "channelProductNo": 13095172525,
    "channelServiceType": "STOREFARM",
    "categoryId": "50000836",
    "name": "DOLCE&GABBANA 다크블루 워싱 데님 팬츠 MAN-28인치",
    "sellerManagementCode": "E1117N062",
    "statusType": "SALE",
    "salePrice": 210000,
    "stockQuantity": 1,
    "deliveryFee": 3500
  }]
}
```

### 상품 상세 (originProduct)
```json
{
  "statusType": "SALE",
  "saleType": "NEW",
  "leafCategoryId": "50000836",
  "name": "...",
  "detailContent": "<div>...</div>",
  "images": { "representativeImage": { "url": "..." } },
  "salePrice": 210000,
  "stockQuantity": 1,
  "deliveryInfo": { "deliveryFee": { "deliveryFeeType": "CONDITIONAL_FREE", "baseFee": 3500 } },
  "customerBenefit": { "purchasePointPolicy": { "value": 5, "unitType": "PERCENT" } },
  "detailAttribute": {}
}
```

## 4. 수정 API 주의사항
*   **PUT만 가능** (PATCH 404 반환). 전체 데이터를 보내야 함.
*   **필수 필드**: `originProduct.statusType` 누락 시 400 에러 (`NotValidEnum`)
*   **수정 패턴**: 조회 → 기존 데이터 복사 → 변경 필드 수정 → PUT 전송
*   **에러 처리**: `BAD_REQUEST` 발생 시 `invalidInputs` 필드에서 구체적 원인 확인.

## 5. 인증 방식 (bcrypt 서명)
```javascript
// EC2 프록시 서버에서 처리
const password = `${client_id}_${timestamp}`;
const hashed = bcrypt.hashSync(password, client_secret); // client_secret을 salt로 사용
const client_secret_sign = Buffer.from(hashed).toString('base64');
```

## 6. 프록시 서버 구성
*   **위치**: EC2 `15.164.216.212:3001`
*   **버전**: v4 (Unified `/v1`, `/v2` handler)
*   **역할**: 고정 IP 제공 + 네이버 API bcrypt 서명 처리
*   **경로 매핑**: `/v1/*` → `https://api.commerce.naver.com/external/v1/*`

## 7. DB 스키마 (신규 추가)
```sql
-- 네이버 카테고리 캐시
CREATE TABLE naver_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whole_category_name TEXT,
  is_last BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 네이버 상품 동기화 매핑
CREATE TABLE naver_product_map (
  origin_product_no TEXT PRIMARY KEY,
  channel_product_no TEXT,
  naver_category_id TEXT,
  archive_category_id TEXT,
  name TEXT,
  sale_price INTEGER,
  stock_quantity INTEGER,
  status_type TEXT,
  seller_management_code TEXT,
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
