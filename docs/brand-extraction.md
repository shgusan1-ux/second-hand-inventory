# 브랜드 자동 추출 기능

## 개요

재고 목록에 상품을 등록할 때, 상품명에서 영어 브랜드명을 자동으로 추출하는 기능입니다.

## 규칙

상품명에서 **자체상품코드 다음에 나오는 첫 번째 영어 단어**가 브랜드로 자동 추출됩니다.

### 예시

| 자체상품코드 | 상품명 | 추출되는 브랜드 |
|-------------|--------|----------------|
| AAAAIR2079 | SNOZU 스노즈 아카이브 후리스 배색 윈터 후드 집업 자켓 KIDS-140 | **SNOZU** |
| AAAADK2043 | OSHKOSH 어쩌고 저쩌고 | **OSHKOSH** |
| ABC123 | NIKE 나이키 티셔츠 | **NIKE** |
| XYZ001 | H&M 에이치앤엠 상품 | **H&M** |

## 적용 범위

이 기능은 다음 상품 등록 방법에서 모두 적용됩니다:

### 1. 엑셀 대량 등록 (Bulk Product Form)
- **파일**: `src/components/inventory/bulk-product-form.tsx`
- **동작**: 
  - Q열(17번째 컬럼)에 브랜드가 입력되어 있으면 그대로 사용
  - Q열이 비어있으면 상품명(C열)에서 자동 추출

### 2. 코너로지스 데이터 가져오기
- **파일**: `src/components/inventory/corner-logis-import.tsx`
- **동작**: 
  - 코너로지스 데이터에는 브랜드 필드가 없으므로
  - 상품명에서 자동으로 브랜드 추출

### 3. TSV 붙여넣기 (Product Form)
- **파일**: `src/components/inventory/product-form.tsx`
- **동작**:
  - 붙여넣은 데이터의 브랜드 컬럼(3번째)이 있으면 사용
  - 비어있으면 상품명에서 자동 추출

## 기술 구현

### 핵심 함수

**파일**: `src/lib/brand-extractor.ts`

#### `extractBrandFromName(productName: string): string`
상품명에서 영어 브랜드명을 추출합니다.

```typescript
// 예시
extractBrandFromName('AAAAIR2079 SNOZU 스노즈 아카이브...')
// 결과: 'SNOZU'
```

#### `ensureBrand(productName: string, existingBrand?: string): string`
기존 브랜드가 있으면 사용하고, 없으면 상품명에서 추출합니다.

```typescript
// 브랜드가 이미 있는 경우
ensureBrand('AAAAIR2079 SNOZU 스노즈...', 'CUSTOM')
// 결과: 'CUSTOM'

// 브랜드가 없는 경우
ensureBrand('AAAAIR2079 SNOZU 스노즈...', '')
// 결과: 'SNOZU'
```

### 추출 로직

1. 상품명을 공백으로 분리
2. 첫 번째 부분(상품코드)을 건너뜀
3. 두 번째 부분부터 순회하면서 영어 단어 찾기
4. 영어 단어 패턴: `[A-Z][A-Z0-9&\-'\.]*`
   - 대문자로 시작
   - 숫자, &, -, ', . 허용 (예: H&M, BRAND123)
5. 찾은 첫 번째 영어 단어를 대문자로 변환하여 반환

## 테스트

테스트 스크립트를 실행하여 기능을 검증할 수 있습니다:

```bash
node scripts/test-brand-extractor.mjs
```

## 주의사항

1. **상품코드 다음의 첫 번째 영어 단어만 추출됩니다**
   - 상품명 중간이나 끝에 있는 영어는 무시됩니다
   
2. **영어 단어가 없으면 빈 문자열을 반환합니다**
   - 예: "ABC123 한글만 있는 상품" → ""

3. **기존 브랜드 값이 우선됩니다**
   - 엑셀 Q열에 브랜드가 입력되어 있으면 그 값을 사용
   - 자동 추출은 브랜드 필드가 비어있을 때만 실행

## 수정 이력

- 2026-02-07: 초기 구현
  - 브랜드 자동 추출 유틸리티 함수 생성
  - 모든 상품 등록 폼에 적용
  - 테스트 스크립트 작성
