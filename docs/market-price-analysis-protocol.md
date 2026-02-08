# Korea 4-Way Market Price Intelligence Protocol

## 🛡️ Antigravity Mission
국내 4대 중고 플랫폼의 데이터를 교차 분석하여, 가장 현실적이고 수익성 높은 '최적 판매가'와 '아카이브 리포트'를 생성합니다.

## [Step-by-Step Execution Protocol]

### Step 1. KREAM (Standardization)
- **URL:** [https://kream.co.kr](https://kream.co.kr)
- **Task:** 해당 모델 검색 후 '최근 체결 거래' 탭 확인.
- **Goal:** 새 상품(Deadstock)의 최근 3건 평균 낙찰가를 추출하여 **[Market Ceiling(상한선)]**으로 설정.

### Step 2. Musinsa USED (Quality Benchmarking)
- **URL:** [https://musinsa.com/used](https://musinsa.com/used)
- **Task:** 유사 상품군 및 브랜드의 '판매 중' 매물을 스캔.
- **Goal:** 당사 상품 등급(A/B급)과 동일한 조건의 판매가를 확인하여 **[Standard Commercial Price(상업 표준가)]**로 기록.

### Step 3. Bunjang (Real-time Demand)
- **URL:** [https://m.bunjang.co.kr](https://m.bunjang.co.kr)
- **Task:** 정확도순 검색을 통해 실시간 매물 5개의 가격 스캔.
- **Goal:** 가장 거래가 활발한 가격대를 추출하여 **[Liquid Price(유동 시세)]** 도출.

### Step 4. Fruitsfamily (Premium Archive Value)
- **URL:** [https://fruitsfamily.com](https://fruitsfamily.com)
- **Task:** 하이엔드/아카이브 전문 셀러들이 해당 브랜드에 부여한 가치와 가격대 스캔.
- **Goal:** 컬렉터들이 인정하는 **[Premium Added Value(가치 할증가)]** 파악.

---

## [Final Output Generation]

### 1. Price Synthesis (Calculation Logic)
```
Base_Price = (KREAM * 0.5) + (Musinsa_USED * 0.2) + (Bunjang * 0.2) + (Fruits * 0.1)
```
*상태 등급 및 국내 희소성에 따라 ±10% 내외로 최종 조정*

### 2. MD 소개 Artifact
- 플랫폼별 시세 비교표 (Table)
- 최종 제시 가격 (KRW)
- **MD 코멘트 Example:** "4대 플랫폼 통합 분석 결과, 현재 국내에서 가장 자산 가치를 높게 인정받을 수 있는 전략적 가격입니다."
