# 네이버 커머스 API 기능 구현 계획

작성일: 2026-02-11

## 🎯 목표
네이버 스마트스토어 상품을 자동으로 관리하고, 재고/가격/상태를 동기화하는 시스템 구축

## 📋 구현 범위 (6개 대분류)
1. **상품관리** - 조회/수정/등록/삭제
2. **카테고리관리** - 네이버 카테고리 + 내부 아카이브
3. **재고관리** - 동기화, 품절 처리, 알림
4. **가격관리** - 동적 할인, 가격 히스토리
5. **이미지관리** - Vision API 연동, 자동 업로드
6. **자동화 워크플로우** - 배치 작업, 이벤트 기반 처리

---

## 📦 1. 상품 관리 (Product Management)

### 1-1. 상품 조회 (Read)
- [ ] **전체 상품 목록 가져오기**
  - API: `GET /v2/products`
  - 기능: 네이버 스마트스토어의 모든 상품 조회
  - 산출물: 총 상품 개수, 상품 목록 (ID, 이름, 가격, 재고, 상태)

- [ ] **특정 상품 상세 조회**
  - API: `GET /v2/products/{productId}`
  - 기능: 상품 ID로 상세 정보 조회
  - 산출물: 옵션, 카테고리, 상세설명, 이미지, 배송정보

- [ ] **상품 상태별 필터링**
  - 판매중 (`SALE`)
  - 품절 (`OUTOFSTOCK`)
  - 판매대기 (`WAIT`)
  - 삭제 (`DELETE`)

### 1-2. 상품 수정 (Update)
- [ ] **재고 수량 업데이트**
  - API: `PATCH /v2/products/{productId}/stock`
  - 기능: 특정 상품의 재고 수량 변경
  - 트리거: 오프라인 판매, 재입고

- [ ] **가격 변경**
  - API: `PATCH /v2/products/{productId}/price`
  - 기능: 판매가 변경
  - 트리거: 할인 이벤트, 시즌 세일

- [ ] **판매 상태 변경**
  - 판매 시작/중지 (`SALE` ↔ `WAIT`)
  - 품절 처리 (`OUTOFSTOCK`)

- [ ] **옵션 관리**
  - 옵션 추가/삭제 (색상, 사이즈 등)
  - 옵션별 재고/가격 변경

- [ ] **상세설명 수정**
  - HTML 컨텐츠 업데이트
  - 이미지 추가/삭제

### 1-3. 상품 등록 (Create)
- [ ] **신규 상품 등록**
  - API: `POST /v2/products`
  - 기능: 새로운 상품을 스마트스토어에 등록
  - 필수 데이터: 상품명, 가격, 카테고리, 이미지, 재고

- [ ] **이미지 업로드**
  - API: `POST /v1/product-images` (추정)
  - 기능: 상품 이미지를 네이버 서버에 업로드
  - 제약: 외부 URL 직접 입력 불가

### 1-4. 상품 삭제 (Delete)
- [ ] **상품 삭제**
  - API: `DELETE /v2/products/{productId}`
  - 기능: 상품을 스마트스토어에서 제거

---

## 🗂️ 2. 카테고리 관리 (Category Management)

### 2-1. 네이버 카테고리 (Naver Categories)
- [ ] **카테고리 전체 조회**
  - API: `GET /v1/categories`
  - 기능: 네이버 제공 카테고리 트리 가져오기 (5804개)
  - 활용: 상품 등록 시 올바른 카테고리 ID 선택

- [ ] **카테고리 검색**
  - 키워드로 카테고리 찾기 (예: "빈티지", "밀리터리")

- [ ] **카테고리 매핑**
  - 상품 → 네이버 카테고리 연결
  - DB 저장: `naver_category` 테이블 (캐시)

### 2-2. 내부 아카이브 카테고리 (Internal Archive Categories)
- [ ] **아카이브 카테고리 CRUD**
  - 테이블: `archive_categories`
  - 필드: `id`, `name`, `parent_id`, `sort_order`, `created_at`
  - 예시: British, Europe, Japan, Military, Workwear

- [ ] **상품 → 아카이브 매핑**
  - 테이블: `product_archive_map`
  - 필드: `productId`, `archiveCategoryId`, `memo`

- [ ] **통합 조회**
  - 상품 조회 시 네이버 카테고리 + 아카이브 카테고리 함께 표시

---

## 📊 3. 재고 관리 (Inventory Management)

### 3-1. 재고 동기화
- [ ] **실시간 재고 확인**
  - 네이버 상품 재고 ↔ 내부 DB 재고 비교

- [ ] **자동 재고 업데이트**
  - 오프라인 판매 → 네이버 재고 차감
  - 네이버 주문 → 내부 재고 차감

- [ ] **품절 자동 처리**
  - 재고 0 → 상태를 `OUTOFSTOCK`으로 변경

### 3-2. 재고 알림
- [ ] **재고 부족 알림**
  - 재고 임계값 설정 (예: 5개 미만)
  - 알림 발송 (이메일/슬랙/문자)

---

## 💰 4. 가격 관리 (Pricing Management)

### 4-1. 동적 가격 조정
- [ ] **시즌 할인 자동 적용**
  - 설정한 기간 동안 자동 할인 (예: 20% OFF)
  - 기간 종료 후 원가 복구

- [ ] **오래된 재고 할인**
  - 등록 후 90일 경과 상품 자동 할인 (예: 30% OFF)

### 4-2. 가격 히스토리
- [ ] **가격 변경 이력 저장**
  - 테이블: `price_history`
  - 필드: `productId`, `oldPrice`, `newPrice`, `changedAt`, `reason`

---

## 🖼️ 5. 이미지 관리 (Image Management)

### 6-1. 이미지 업로드
- [ ] **Vision API 연동**
  - Google Vision API로 이미지 분석
  - 결과물 → 네이버 상품 이미지 업로드

- [ ] **이미지 최적화**
  - 리사이징, 압축 (네이버 권장 사이즈)

---

## 🔄 6. 자동화 워크플로우 (Automation Workflows)

### 8-1. 배치 작업
- [ ] **일일 재고 동기화**
  - 매일 자정 네이버 ↔ 내부 DB 재고 동기화

- [ ] **주간 가격 점검**
  - 매주 오래된 재고 자동 할인

### 8-2. 이벤트 기반 자동화
- [ ] **품절 시 자동 처리**
  - 재고 0 → 상태 변경 → 관리자 알림

- [ ] **신규 상품 자동 등록**
  - 내부 DB에 상품 추가 → 네이버에 자동 등록

---

## 📋 우선순위 로드맵

### Phase 1: 기본 조회/수정 (현재 단계)
1. ✅ 토큰 발급
2. ⏳ 상품 목록 조회
3. ⏳ 상품 상세 조회
4. ⏳ 상품 재고/가격 수정
5. ⏳ 카테고리 관리 (네이버 + 아카이브)

### Phase 2: 자동화
6. 재고 동기화 배치
7. 품절 자동 처리
8. 오래된 재고 자동 할인

### Phase 3: 고급 기능
9. 주문 관리
10. 이미지 자동 업로드
11. 분석 대시보드

---

## 🛠️ 기술 스택

- **API 프록시**: EC2 Ubuntu + Node.js + Express (고정 IP)
- **인증**: OAuth2 Bearer Token (bcrypt + Base64)
- **데이터베이스**: Turso (LibSQL)
- **프론트엔드**: Next.js 16
- **배포**: Vercel

---

## 📝 참고 문서

- [네이버 커머스 API 센터](https://apicenter.commerce.naver.com/ko/basic/main)
- [GitHub - commerce-api-naver](https://github.com/commerce-api-naver/commerce-api)
- 내부 학습 문서: `docs/naver_commerce_api_study.md`
