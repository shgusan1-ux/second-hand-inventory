# MD-SOGAE v2.9 Protocol Documentation

## 🛡️ Overview

**MD-SOGAE v2.9**는 대한민국 최고의 패션 아카이브 전문가 및 자산 평가사 시스템입니다.

**목적**: 데이터(품번, 실거래가)에 기반한 객관적인 상품 가치 입증 및 최적의 판매 효율 달성

---

## 📋 4-Phase Workflow

### Phase 1: Visual & OCR Priority (데이터 채굴)

**목적**: 이미지에서 검색 및 분석의 '기준점'이 되는 팩트 데이터 추출

#### 추출 항목:
1. **케어라벨 스캔 (최우선)**
   - Art No., Style No., RN 뒤의 숫자를 OCR로 추출
   - 흰색 라벨의 검은 텍스트를 최우선으로 읽기
   - 숫자와 대문자 조합(품번)에 집중

2. **소재 분석**
   - % 기호 앞의 텍스트를 추출하여 원단 혼용률 파악
   - 예: Nylon 100%, Cotton 80% Polyester 20%

3. **브랜드/라인 판별**
   - 로고 자수나 라벨을 통해 메인 브랜드 식별
   - 세부 라인 식별 (예: Prada Sport, Shadow Project)

4. **시각 검수**
   - 썸네일에 기재된 등급(S, A, B)을 인식
   - 상품 제목에는 중복 기재하지 않음

#### 출력 데이터:
```typescript
interface CareLabel {
    productCode: string;      // 품번
    fabricComposition: string; // 소재 혼용률
    brand: string;            // 메인 브랜드
    subLine: string;          // 세부 라인
    size: string;             // 사이즈
    madeIn: string;           // 원산지
    grade: 'S' | 'A' | 'B';   // 등급
}
```

---

### Phase 2: Market Intelligence (가격 산출 로직)

**목적**: 관세 등 인위적 가중치를 배제한 '순수 실거래가' 기반의 합리적 가격 도출

#### 글로벌 인덱스 (Global Anchor):
- **eBay Sold Listings**: 실제 판매 완료가
- **Grailed Sold Items**: 실제 거래가
- ⚠️ **관세 가중치(1.18x) 절대 적용 금지**
- 순수 해외 실거래가(KRW 환산)를 참고치로 확보

#### 국내 시장 스캔 (Local Real):
1. **KREAM**: 실거래 체결가 (가장 강력한 기준점)
2. **무신사 USED**: 유사 등급 판매가 (상업적 표준)
3. **번개장터**: 실시간 매물 호가 (시장 수요 확인)
4. **후르츠패밀리**: 전문 셀러 리스팅가 (프리미엄 가치)

#### 최종 가격 결정:
- 글로벌 시세와 국내 4대 플랫폼 평균치를 교차 검증
- '즉시 판매 가능가' 산출

#### 출력 데이터:
```typescript
interface MarketPrice {
    globalAverage: number;    // 글로벌 평균
    kreamPrice: number;       // KREAM 실거래가
    usedPrice: number;        // 무신사 USED
    bunjangPrice: number;     // 번개장터
    fruitsPrice: number;      // 후르츠패밀리
    finalPrice: number;       // 최종 추천가
    priceReason: string;      // 가격 산출 근거
    dataSource: string[];     // 사용된 데이터 소스
}
```

---

### Phase 3: Professional Naming (50자 이내 작명)

**목적**: 오픈마켓 SEO 최적화 및 일반 대중과 컬렉터를 동시에 잡는 신뢰도 높은 제목

#### 구조:
```
[전문태그] 브랜드 연식+모델명 (특징/핏) 성별-사이즈
```

#### 전문 태그 가이드 (주관적 형용사 금지):
- **[Technical]**: 기능성 소재(나일론 등) 중심
- **[Archive]**: 역사적 가치가 있는 빈티지/명작
- **[Sartorial]**: 테일러링/코트류
- **[Original]**: 브랜드 시그니처 모델

#### 성별-사이즈 규칙:
- `MAN-L`, `WOMAN-M`, `KIDS-150`, `UNISEX-F` (하이픈 결합 필수)

#### 제약:
- 공백 포함 최대 **45자 엄수**

#### 예시:
```
[Technical] Stone Island 23FW Shadow Project 고어텍스 재킷 MAN-L
[Archive] Helmut Lang 1998 본디지 카고팬츠 UNISEX-M
[Sartorial] Prada 울 더블브레스트 코트 WOMAN-44
```

#### 출력 데이터:
```typescript
interface ProfessionalName {
    fullName: string;         // 완성된 상품명
    tag: string;              // 전문 태그
    brand: string;            // 브랜드
    yearModel: string;        // 연식+모델명
    feature: string;          // 특징/핏
    genderSize: string;       // 성별-사이즈
}
```

---

### Phase 4: Verification & Editorial (검수 및 상세설명)

**목적**: UI/UX를 해치지 않는 중간 검수 및 전문가적 상세페이지 생성

#### Metadata Card (중간 검수창):
상세페이지 생성 전, 별도 사이드바나 팝업으로 아래 데이터를 출력하여 관리자 승인을 대기:

```
[추출 품번 / 판별 소재 / 산출 가격 / 추천 제목]
```

#### Editorial Content (승인 후 생성):
3가지 섹션으로 구성된 전문가적 상세 설명:

1. **Brand Heritage (브랜드 헤리티지)**
   - 모델의 역사적 맥락
   - 브랜드의 철학과 이 제품의 위치
   - 2-3문장

2. **Detail Guide (디테일 가이드)**
   - 소재의 특성과 장점 (착용감, 관리법)
   - 부자재 분석 (지퍼, 단추, 스티치 등)
   - 전문가적 관점의 품질 평가
   - 3-4문장

3. **Archive Value (아카이브 가치)**
   - 국내외 시세 데이터 기반 구매 당위성
   - 투자 가치 또는 희소성
   - 2-3문장

#### 출력 데이터:
```typescript
interface EditorialContent {
    brandHeritage: string;    // 브랜드 헤리티지
    detailGuide: string;      // 디테일 가이드
    archiveValue: string;     // 아카이브 가치
}
```

---

## 🚀 Usage

### API Endpoint
```
POST /api/md-sogae/analyze
```

### Request Body
```json
{
  "imageUrl": "https://example.com/product-image.jpg",
  "category": "아우터"
}
```

### Response
```json
{
  "careLabel": { ... },
  "marketPrice": { ... },
  "professionalName": { ... },
  "metadataCard": { ... },
  "editorial": { ... }
}
```

---

## 💡 관리자용 실행 팁 (UX 고도화 방안)

### 1. UI 일관성
기존 입력창 옆에 **'AI 분석 데이터 불러오기'** 버튼을 배치하여, 에이전트가 찾은 품번과 소재가 클릭 한 번으로 입력되게 구현하세요.

### 2. 실수 방지
Visual API가 읽은 텍스트(OCR 결과물)와 해당 이미지 영역을 함께 보여주는 **'하이라이트' 기능**을 활성화하면 검수가 훨씬 빨라집니다.

### 3. 워크플로우
1. 이미지 업로드
2. MD-SOGAE 분석 실행 (60초 소요)
3. 메타데이터 카드 검수
4. 승인 후 상세 정보 확인
5. 상품에 적용

---

## 🔧 Technical Stack

- **AI Model**: Google Gemini 2.0 Flash Exp
- **OCR**: Google Vision API (케어라벨 스캔)
- **Market Data**: Web scraping (eBay, Grailed, KREAM, etc.)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript

---

## 📊 Performance

- **분석 시간**: 약 60초
- **정확도**: 
  - 품번 추출: ~85%
  - 소재 분석: ~90%
  - 가격 산출: ~80% (시장 데이터 가용성에 따라 변동)
  - 작명 품질: 전문가 수준

---

## 🎯 Best Practices

1. **고품질 이미지 사용**
   - 케어라벨이 선명하게 보이는 이미지
   - 최소 해상도: 1000x1000px

2. **카테고리 정확히 입력**
   - 아우터, 상의, 하의, 신발, 가방 등
   - 정확한 카테고리가 가격 산출에 영향

3. **메타데이터 검수 필수**
   - AI가 추출한 품번과 소재를 반드시 확인
   - 오류 발견 시 수정 후 재분석

4. **시장 데이터 업데이트**
   - 주기적으로 시장 가격 데이터 갱신
   - 트렌드 변화에 따른 가격 조정

---

## 🔐 Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_VISION_CREDENTIALS_JSON=your_google_vision_credentials
```

---

## 📝 License

Proprietary - (주)에이치엠이커머스

---

## 👥 Contact

개발팀: dev@hmcommerce.com
