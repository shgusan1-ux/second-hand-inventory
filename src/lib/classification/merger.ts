/**
 * 분류 통합 머저: Text + Vision + 수동 브랜드
 * - text(40%) + vision(60%)
 * - 일치 → +20 부스트
 * - 수동 브랜드 → 무조건 우선
 */

import type { ProductClassification } from './types';
import type { GeminiVisionResult } from '@/lib/vision/types';
import { lookupBrand } from './brand-tier-database';

export interface CustomBrand {
  brand_name: string;
  brand_name_ko: string | null;
  tier: string;
}

export interface MergedClassification extends ProductClassification {
  visionBrand?: string;
  visionClothingType?: string;
  visionGrade?: string;
  visionColors?: string[];
  visionPattern?: string;
  visionFabric?: string;
  visionConfidence?: number;
  visionStatus: 'none' | 'pending' | 'processing' | 'completed' | 'failed';
  mergedConfidence: number;
}

// 의류 타입 한국어 → 영문 매핑 (Vision은 한국어, Text는 영문)
const clothingTypeKoToEn: Record<string, string> = {
  '상의': 'TOPS',
  '하의': 'BOTTOMS',
  '아우터': 'OUTERWEAR',
  '원피스': 'DRESS',
  '기타': 'OTHER',
};

export function mergeClassifications(
  textResult: ProductClassification,
  visionResult: GeminiVisionResult | null,
  customBrand: CustomBrand | null
): MergedClassification {
  // Vision 없으면 text 그대로 반환
  if (!visionResult) {
    const merged: MergedClassification = {
      ...textResult,
      visionStatus: 'none',
      mergedConfidence: textResult.confidence,
    };

    // 수동 브랜드만 오버라이드
    if (customBrand) {
      merged.brand = customBrand.brand_name;
      merged.brandTier = customBrand.tier as any;
      merged.mergedConfidence = Math.min(100, textResult.confidence + 10);
    }

    return merged;
  }

  // Vision 있을 때: 가중 합산
  const textConf = textResult.confidence;
  const visionConf = visionResult.confidence;
  let baseConfidence = Math.round(textConf * 0.4 + visionConf * 0.6);

  // 브랜드 결정
  let brand = textResult.brand;
  let brandTier = textResult.brandTier;

  if (customBrand) {
    // 수동 브랜드 최우선
    brand = customBrand.brand_name;
    brandTier = customBrand.tier as any;
    baseConfidence = Math.min(100, baseConfidence + 10);
  } else if (visionResult.brand && visionResult.brand !== '') {
    // Vision 브랜드가 있으면 우선 (로고/라벨 기반)
    if (!textResult.brand || textResult.brand === '' || textResult.brandTier === 'OTHER') {
      brand = visionResult.brand;
      const lookup = lookupBrand(visionResult.brand);
      brandTier = lookup.tier;
    }
    // Text와 Vision 일치하면 부스트
    if (textResult.brand.toUpperCase() === visionResult.brand.toUpperCase()) {
      baseConfidence = Math.min(100, baseConfidence + 15);
    }
  }

  // 의류 타입 결정
  let clothingType = textResult.clothingType;
  let clothingSubType = textResult.clothingSubType;

  if (visionResult.clothingType === textResult.clothingType) {
    // 일치 → 부스트
    baseConfidence = Math.min(100, baseConfidence + 10);
  } else if (textResult.clothingType === '기타' || textResult.clothingType === 'UNKNOWN' as any) {
    // Text에서 분류 못했으면 Vision 채택 (Vision은 한국어로 상의/하의 등 반환함)
    clothingType = visionResult.clothingType as any;
    clothingSubType = visionResult.clothingSubType as any;
  } else if (visionConf > textConf) {
    // Vision confidence가 더 높으면 Vision 채택
    clothingType = visionResult.clothingType as any;
    clothingSubType = visionResult.clothingSubType as any;
  }

  // 성별 결정 (Text가 보통 더 정확 - 상품명에 MAN/WOMAN 명시)
  let gender = textResult.gender;
  if (gender === 'UNKNOWN' && visionResult.gender !== 'UNKNOWN') {
    gender = visionResult.gender as any;
    baseConfidence = Math.min(100, baseConfidence + 5);
  } else if (gender === visionResult.gender) {
    baseConfidence = Math.min(100, baseConfidence + 5);
  }

  return {
    brand,
    brandTier,
    gender,
    size: textResult.size || visionResult.size || 'FREE',
    clothingType,
    clothingSubType,
    confidence: Math.min(100, baseConfidence),
    suggestedNaverCategory: textResult.suggestedNaverCategory,
    classifiedAt: new Date().toISOString(),
    // Vision 추가 정보
    visionBrand: visionResult.brand || undefined,
    visionClothingType: visionResult.clothingType || undefined,
    visionGrade: visionResult.grade || undefined,
    visionColors: visionResult.colors?.length > 0 ? visionResult.colors : undefined,
    visionPattern: visionResult.pattern || undefined,
    visionFabric: visionResult.fabric || undefined,
    visionConfidence: visionResult.confidence,
    visionStatus: 'completed',
    mergedConfidence: Math.min(100, baseConfidence),
  };
}
