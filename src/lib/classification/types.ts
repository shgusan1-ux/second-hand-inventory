// 자동 분류 시스템 타입 정의

export type Gender = 'MAN' | 'WOMAN' | 'KIDS' | 'UNISEX' | 'UNKNOWN';

export type ClothingType = '상의' | '하의' | '아우터' | '원피스' | '기타';

export type ClothingSubType =
  // 상의
  | '티셔츠' | '셔츠' | '블라우스' | '니트' | '스웨터' | '후디' | '맨투맨'
  | '폴로' | '탱크탑' | '롱슬리브' | '반팔' | '터틀넥' | '카라티'
  // 하의
  | '팬츠' | '데님' | '스커트' | '쇼츠' | '큐롯' | '슬랙스' | '조거'
  | '치노' | '카고팬츠' | '와이드팬츠' | '부츠컷'
  // 아우터
  | '자켓' | '코트' | '점퍼' | '블레이저' | '가디건' | '베스트' | '야상'
  | '윈드브레이커' | '패딩' | '트렌치코트' | '라이더' | '필드자켓' | '사파리자켓'
  // 원피스
  | '원피스' | '드레스' | '점프수트'
  // 기타
  | '가방' | '모자' | '액세서리' | '신발' | '머플러' | '벨트' | '기타';

export type BrandTier =
  | 'MILITARY'
  | 'WORKWEAR'
  | 'JAPAN'
  | 'HERITAGE'
  | 'BRITISH'
  | 'OTHER';

export interface ProductClassification {
  brand: string;
  brandTier: BrandTier;
  gender: Gender;
  size: string;
  clothingType: ClothingType;
  clothingSubType: ClothingSubType;
  confidence: number; // 0-100
  suggestedNaverCategory?: string;
  classifiedAt: string;
}

export interface ParsedProductName {
  brand: string;
  brandKorean: string;
  description: string;
  gender: Gender;
  size: string;
}

export interface BrandInfo {
  canonical: string;
  aliases: string[];
  tier: BrandTier;
  origin: string;
}

export interface ClothingMatch {
  type: ClothingType;
  subType: ClothingSubType;
  matchedKeyword: string;
}

export interface ClassificationLogEntry {
  productNo: string;
  productName: string;
  result: ProductClassification;
  timestamp: string;
}
