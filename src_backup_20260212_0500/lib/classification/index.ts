// 통합 분류 엔트리포인트 + 교차검증 로거
import { parseProductName } from './name-parser';
import { matchClothingType } from './clothing-type-matcher';
import { lookupBrand } from './brand-tier-database';
import { suggestNaverCategory } from './naver-category-mapper';
import type { ProductClassification, ClassificationLogEntry } from './types';

// Re-export
export type { ProductClassification, ClassificationLogEntry } from './types';

// ===== 분류 함수 =====

export function classifyProduct(productName: string): ProductClassification {
  // 1. 상품명 파싱
  const parsed = parseProductName(productName);

  // 2. 브랜드 티어 조회
  const brandResult = lookupBrand(parsed.brand);

  // 3. 의류 타입 매칭
  const clothing = matchClothingType(parsed.description);

  // 4. 네이버 카테고리 추천
  const naverCategory = suggestNaverCategory(clothing.subType, parsed.gender);

  // 5. confidence 계산
  const confidence = calculateConfidence(parsed, brandResult.tier, clothing, naverCategory);

  return {
    brand: parsed.brand,
    brandTier: brandResult.tier,
    gender: parsed.gender,
    size: parsed.size,
    clothingType: clothing.type,
    clothingSubType: clothing.subType,
    confidence,
    suggestedNaverCategory: naverCategory || undefined,
    classifiedAt: new Date().toISOString(),
  };
}

function calculateConfidence(
  parsed: ReturnType<typeof parseProductName>,
  brandTier: string,
  clothing: ReturnType<typeof matchClothingType>,
  naverCategory: string | null
): number {
  let score = 0;

  // 브랜드 (30점)
  if (parsed.brand && parsed.brand !== 'UNKNOWN') {
    score += 15;
    if (brandTier !== 'OTHER') score += 15;
  }

  // 성별 (15점)
  if (parsed.gender !== 'UNKNOWN') score += 15;

  // 사이즈 (10점)
  if (parsed.size) score += 10;

  // 의류 타입 (30점)
  if (clothing.type !== '기타') {
    score += 15;
    if (clothing.subType !== '기타') score += 15;
  }

  // 네이버 카테고리 (15점)
  if (naverCategory) score += 15;

  return score;
}

// ===== 교차검증 로거 =====

let classificationLog: ClassificationLogEntry[] = [];

export function logClassification(productNo: string, productName: string, result: ProductClassification) {
  classificationLog.push({
    productNo,
    productName,
    result,
    timestamp: new Date().toISOString(),
  });
  // 메모리 한도: 최근 5000건
  if (classificationLog.length > 5000) {
    classificationLog = classificationLog.slice(-5000);
  }
}

export function getClassificationLog(): ClassificationLogEntry[] {
  return classificationLog;
}

export function getClassificationStats() {
  const log = classificationLog;
  if (log.length === 0) return { total: 0, avgConfidence: 0, byClothingType: {}, byBrandTier: {}, byGender: {}, lowConfidence: 0 };

  const byClothingType: Record<string, number> = {};
  const byBrandTier: Record<string, number> = {};
  const byGender: Record<string, number> = {};
  let totalConfidence = 0;
  let lowConfidence = 0;

  for (const entry of log) {
    const r = entry.result;
    totalConfidence += r.confidence;
    if (r.confidence < 40) lowConfidence++;

    byClothingType[r.clothingType] = (byClothingType[r.clothingType] || 0) + 1;
    byBrandTier[r.brandTier] = (byBrandTier[r.brandTier] || 0) + 1;
    byGender[r.gender] = (byGender[r.gender] || 0) + 1;
  }

  return {
    total: log.length,
    avgConfidence: Math.round(totalConfidence / log.length),
    byClothingType,
    byBrandTier,
    byGender,
    lowConfidence,
  };
}

export function clearClassificationLog() {
  classificationLog = [];
}
